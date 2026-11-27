import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/expenses/[id]">) {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.storeExpense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (existing.shiftExpenseId) {
        await tx.cashExpense.deleteMany({ where: { id: existing.shiftExpenseId } });
      }
      await tx.storeExpense.delete({ where: { id } });
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/expenses/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus pengeluaran" }, { status: 400 });
  }
}
