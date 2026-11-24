import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { transactionCreateSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const filter = req.nextUrl.searchParams.get("filter") ?? "ALL"; // ALL | TUNAI | QRIS | REFUND
    const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
    const range = req.nextUrl.searchParams.get("range") ?? "today"; // today | 7d | 30d | all

    const now = new Date();
    let dateFilter: { gte?: Date } | undefined;
    if (range === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      dateFilter = { gte: start };
    } else if (range === "7d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      dateFilter = { gte: start };
    } else if (range === "30d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      dateFilter = { gte: start };
    }

    const where: Record<string, unknown> = {};
    if (dateFilter) where.createdAt = dateFilter;

    if (filter === "TUNAI") {
      where.paymentMethod = "TUNAI";
      where.status = "SELESAI";
    } else if (filter === "QRIS") {
      where.paymentMethod = "QRIS";
      where.status = "SELESAI";
    } else if (filter === "REFUND") {
      where.status = "REFUND";
    }

    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { packageName: { contains: search, mode: "insensitive" } },
        { capsterName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [transactions, maxOrder] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: [{ orderNumber: "desc" }],
        take: 100,
      }),
      prisma.transaction.aggregate({ _max: { orderNumber: true } }),
    ]);

    const nextOrderNumber = (maxOrder._max.orderNumber ?? 0) + 1;
    const nextOrderCode = `#${String(nextOrderNumber).padStart(4, "0")}`;

    const completedRevenue = transactions
      .filter((t) => t.status === "SELESAI")
      .reduce((acc, t) => acc + t.total, 0);

    return NextResponse.json({
      data: transactions,
      meta: {
        count: transactions.length,
        totalRevenue: completedRevenue,
        nextOrderNumber,
        nextOrderCode,
      },
    });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ error: "Gagal memuat riwayat transaksi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = transactionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data transaksi tidak valid" },
        { status: 400 }
      );
    }

    const [pkg, capster, setting, maxOrder] = await Promise.all([
      prisma.package.findUnique({ where: { id: parsed.data.packageId } }),
      prisma.capster.findUnique({ where: { id: parsed.data.capsterId } }),
      prisma.storeSetting.findUnique({ where: { id: "default" } }),
      prisma.transaction.aggregate({ _max: { orderNumber: true } }),
    ]);

    if (!pkg) {
      return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });
    }
    if (!capster) {
      return NextResponse.json({ error: "Capster tidak ditemukan" }, { status: 404 });
    }

    const subtotal = pkg.price;
    let discountAmount = 0;
    if (parsed.data.discountType === "PERCENT" && parsed.data.discountValue > 0) {
      discountAmount = Math.round((subtotal * Math.min(100, parsed.data.discountValue)) / 100);
    } else if (parsed.data.discountType === "NOMINAL" && parsed.data.discountValue > 0) {
      discountAmount = Math.min(subtotal, parsed.data.discountValue);
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount =
      setting?.taxEnabled && !setting.priceIncludesTax
        ? Math.round((afterDiscount * setting.taxRate) / 100)
        : 0;
    const serviceFeeAmount = setting?.serviceFeeEnabled ? setting.serviceFeeAmount : 0;
    const total = afterDiscount + taxAmount + serviceFeeAmount;

    let cashReceived: number | null = null;
    let changeAmount: number | null = null;
    if (parsed.data.paymentMethod === "TUNAI") {
      cashReceived = parsed.data.cashReceived ?? total;
      if (cashReceived < total && parsed.data.status === "SELESAI") {
        return NextResponse.json(
          { error: "Nominal tunai kurang dari total tagihan" },
          { status: 400 }
        );
      }
      changeAmount = Math.max(0, cashReceived - total);
    }

    const currentUser = await getCurrentUser();
    const nextNumber = (maxOrder._max.orderNumber ?? 0) + 1;
    const orderCode = `#${String(nextNumber).padStart(4, "0")}`;

    const created = await prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          orderNumber: nextNumber,
          orderCode,
          orderType: parsed.data.orderType,
          customerName: parsed.data.customerName,
          isMember: parsed.data.isMember,
          packageId: pkg.id,
          packageName: pkg.name,
          packageDescription: pkg.description,
          capsterId: capster.id,
          capsterName: capster.name,
          bookingId: parsed.data.bookingId ?? null,
          subtotal,
          discountType: parsed.data.discountType ?? null,
          discountValue: parsed.data.discountValue,
          discountAmount,
          discountLabel: parsed.data.discountLabel ?? null,
          voucherCode: parsed.data.voucherCode ?? null,
          taxAmount,
          serviceFeeAmount,
          total,
          paymentMethod: parsed.data.paymentMethod,
          cashReceived,
          changeAmount,
          status: parsed.data.status,
          notes: parsed.data.notes ?? null,
          cashierName: currentUser?.name ?? "Rehan",
        },
      });

      if (parsed.data.bookingId && parsed.data.status === "SELESAI") {
        await tx.booking.update({
          where: { id: parsed.data.bookingId },
          data: { status: "SELESAI" },
        });
      }

      return createdTx;
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ error: "Gagal menyimpan transaksi" }, { status: 500 });
  }
}
