import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shiftCloseSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/shifts/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = shiftCloseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data penutupan shift tidak valid" },
        { status: 400 }
      );
    }

    const shift = await prisma.cashShift.findUnique({
      where: { id },
      include: { expenses: true },
    });
    if (!shift || shift.status === "CLOSED") {
      return NextResponse.json({ error: "Shift tidak ditemukan atau sudah ditutup" }, { status: 404 });
    }

    const cashTx = await prisma.transaction.findMany({
      where: {
        status: "SELESAI",
        paymentMethod: "TUNAI",
        createdAt: { gte: shift.openedAt },
      },
      select: { total: true },
    });

    const cashSales = cashTx.reduce((s, t) => s + t.total, 0);
    const expensesTotal = shift.expenses.reduce((s, e) => s + e.amount, 0);
    const expectedCash = shift.openingCash + cashSales - expensesTotal;

    const user = await getCurrentUser();
    const updated = await prisma.cashShift.update({
      where: { id },
      data: {
        status: "CLOSED",
        closingCashActual: parsed.data.closingCashActual,
        closingCashExpected: expectedCash,
        closedBy: user?.name ?? "Kasir",
        closedAt: new Date(),
        notes: parsed.data.notes ?? shift.notes,
      },
      include: { expenses: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/shifts/[id] error:", error);
    return NextResponse.json({ error: "Gagal menutup shift kasir" }, { status: 400 });
  }
}
