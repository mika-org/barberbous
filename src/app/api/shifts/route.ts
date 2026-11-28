import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { shiftOpenSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  await connection();
  try {
    const [activeShift, recentShifts] = await Promise.all([
      prisma.cashShift.findFirst({
        where: { status: "OPEN" },
        include: {
          expenses: { orderBy: { createdAt: "desc" } },
          kasbons: {
            include: { capster: { select: { id: true, name: true, code: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { openedAt: "desc" },
      }),
      prisma.cashShift.findMany({
        where: { status: "CLOSED" },
        include: {
          expenses: true,
          kasbons: {
            include: { capster: { select: { id: true, name: true, code: true } } },
          },
        },
        orderBy: { closedAt: "desc" },
        take: 10,
      }),
    ]);

    let cashSalesTotal = 0;
    let nonCashSalesTotal = 0;
    let cashTxCount = 0;

    if (activeShift) {
      const shiftTx = await prisma.transaction.findMany({
        where: {
          status: "SELESAI",
          createdAt: { gte: activeShift.openedAt },
        },
        select: { total: true, paymentMethod: true },
      });

      for (const tx of shiftTx) {
        if (tx.paymentMethod === "TUNAI") {
          cashSalesTotal += tx.total;
          cashTxCount += 1;
        } else {
          nonCashSalesTotal += tx.total;
        }
      }
    }

    const expensesTotal = activeShift
      ? activeShift.expenses.reduce((sum, e) => sum + e.amount, 0)
      : 0;
    const kasbonsTotal = activeShift
      ? activeShift.kasbons.reduce((sum, k) => sum + k.amount, 0)
      : 0;
    const expectedCash = activeShift
      ? activeShift.openingCash + cashSalesTotal - expensesTotal - kasbonsTotal
      : 0;

    return NextResponse.json({
      data: {
        activeShift,
        summary: {
          cashSalesTotal,
          nonCashSalesTotal,
          cashTxCount,
          expensesTotal,
          kasbonsTotal,
          expectedCash,
        },
        recentShifts,
      },
    });
  } catch (error) {
    console.error("GET /api/shifts error:", error);
    return NextResponse.json({ error: "Gagal memuat data shift kasir" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const existingOpen = await prisma.cashShift.findFirst({ where: { status: "OPEN" } });
    if (existingOpen) {
      return NextResponse.json(
        { error: "Masih ada shift kasir yang sedang aktif" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = shiftOpenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Modal awal tidak valid" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const created = await prisma.cashShift.create({
      data: {
        status: "OPEN",
        openingCash: parsed.data.openingCash,
        openedBy: user?.name ?? "Kasir",
        notes: parsed.data.notes ?? null,
      },
      include: { expenses: true },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/shifts error:", error);
    return NextResponse.json({ error: "Gagal membuka shift kasir" }, { status: 500 });
  }
}
