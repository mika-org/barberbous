import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { transactionCreateSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";
import { ItemType } from "@prisma/client";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const filter = req.nextUrl.searchParams.get("filter") ?? "ALL"; // ALL | TUNAI | QRIS | DEBIT | MENUNGGU | REFUND
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
    } else if (filter === "DEBIT") {
      where.paymentMethod = "DEBIT";
      where.status = "SELESAI";
    } else if (filter === "MENUNGGU") {
      where.status = "MENUNGGU_PEMBAYARAN";
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
        include: { items: true, member: true },
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

    const requestedItems =
      parsed.data.items && parsed.data.items.length > 0
        ? parsed.data.items
        : [{ itemType: "PACKAGE" as const, packageId: parsed.data.packageId!, quantity: 1 }];

    const packageIds = Array.from(
      new Set(requestedItems.filter((i) => i.itemType !== "DRINK" && i.packageId).map((i) => i.packageId!))
    );
    const drinkIds = Array.from(
      new Set(requestedItems.filter((i) => i.itemType === "DRINK" && i.drinkId).map((i) => i.drinkId!))
    );

    const [packages, drinks, capster, member, setting, maxOrder] = await Promise.all([
      packageIds.length > 0
        ? prisma.package.findMany({ where: { id: { in: packageIds } } })
        : Promise.resolve([]),
      drinkIds.length > 0
        ? prisma.drink.findMany({ where: { id: { in: drinkIds } } })
        : Promise.resolve([]),
      parsed.data.capsterId
        ? prisma.capster.findUnique({ where: { id: parsed.data.capsterId } })
        : Promise.resolve(null),
      parsed.data.memberId
        ? prisma.member.findUnique({ where: { id: parsed.data.memberId } })
        : Promise.resolve(null),
      prisma.storeSetting.findUnique({ where: { id: "default" } }),
      prisma.transaction.aggregate({ _max: { orderNumber: true } }),
    ]);

    const pkgById = new Map(packages.map((p) => [p.id, p]));
    const drinkById = new Map(drinks.map((d) => [d.id, d]));

    const resolvedItems: Array<{
      itemType: ItemType;
      packageId: string | null;
      drinkId: string | null;
      packageName: string;
      packageDescription: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }> = [];

    for (const item of requestedItems) {
      if (item.itemType === "DRINK") {
        const drink = item.drinkId ? drinkById.get(item.drinkId) : undefined;
        if (!drink) {
          return NextResponse.json({ error: "Salah satu minuman tidak ditemukan" }, { status: 404 });
        }
        if (drink.stock < item.quantity) {
          return NextResponse.json(
            { error: `Stok ${drink.name} tersisa ${drink.stock} botol` },
            { status: 400 }
          );
        }
        resolvedItems.push({
          itemType: ItemType.DRINK,
          packageId: null,
          drinkId: drink.id,
          packageName: drink.name,
          packageDescription: drink.category,
          unitPrice: drink.price,
          quantity: item.quantity,
          lineTotal: drink.price * item.quantity,
        });
      } else {
        const pkg = item.packageId ? pkgById.get(item.packageId) : undefined;
        if (!pkg) {
          return NextResponse.json({ error: "Salah satu paket tidak ditemukan" }, { status: 404 });
        }
        resolvedItems.push({
          itemType: ItemType.PACKAGE,
          packageId: pkg.id,
          drinkId: null,
          packageName: pkg.name,
          packageDescription: pkg.description,
          unitPrice: pkg.price,
          quantity: item.quantity,
          lineTotal: pkg.price * item.quantity,
        });
      }
    }

    const firstPackageItem = resolvedItems.find((i) => i.itemType === ItemType.PACKAGE);
    const primaryItem = firstPackageItem ?? resolvedItems[0];
    const totalItemLines = resolvedItems.length;
    const summaryPkgName =
      totalItemLines === 1
        ? primaryItem.quantity > 1
          ? `${primaryItem.packageName} (${primaryItem.quantity}×)`
          : primaryItem.packageName
        : `${primaryItem.packageName} +${totalItemLines - 1} lainnya`;
    const summaryPkgDesc =
      totalItemLines === 1
        ? primaryItem.packageDescription
        : resolvedItems.map((i) => `${i.quantity}× ${i.packageName}`).join(", ");

    const subtotal = resolvedItems.reduce((sum, i) => sum + i.lineTotal, 0);
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

    const resolvedCustomerName = member ? member.name : parsed.data.customerName;
    const resolvedIsMember = member ? true : parsed.data.isMember;

    const created = await prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          orderNumber: nextNumber,
          orderCode,
          orderType: parsed.data.orderType,
          customerName: resolvedCustomerName,
          isMember: resolvedIsMember,
          memberId: member?.id ?? null,
          packageId: firstPackageItem?.packageId ?? null,
          packageName: summaryPkgName,
          packageDescription: summaryPkgDesc,
          capsterId: capster?.id ?? null,
          capsterName: capster?.name ?? (firstPackageItem ? "Siapa saja" : "-"),
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
          items: {
            create: resolvedItems,
          },
        },
        include: { items: true, member: true },
      });

      // Decrement drink stocks
      const drinkDecrements = new Map<string, number>();
      for (const item of resolvedItems) {
        if (item.itemType === ItemType.DRINK && item.drinkId) {
          drinkDecrements.set(item.drinkId, (drinkDecrements.get(item.drinkId) ?? 0) + item.quantity);
        }
      }
      for (const [dId, qty] of drinkDecrements.entries()) {
        await tx.drink.update({
          where: { id: dId },
          data: { stock: { decrement: qty } },
        });
      }

      // Award loyalty points & increment visit if member linked & completed
      if (member && parsed.data.status === "SELESAI") {
        const earnedPoints = Math.max(10, Math.floor(total / 1000) * 10);
        await tx.member.update({
          where: { id: member.id },
          data: {
            points: { increment: earnedPoints },
            visits: { increment: 1 },
            lastVisitAt: new Date(),
            ...(firstPackageItem ? { favoritePackage: firstPackageItem.packageName } : {}),
            ...(capster ? { favoriteCapster: capster.name } : {}),
          },
        });
      }

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
