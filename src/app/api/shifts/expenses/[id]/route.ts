import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/shifts/expenses/[id]">) {
  try {
    const { id } = await ctx.params;
    await prisma.$transaction([
      prisma.storeExpense.deleteMany({ where: { shiftExpenseId: id } }),
      prisma.cashExpense.delete({ where: { id } }),
    ]);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/shifts/expenses/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus kas keluar" }, { status: 400 });
  }
}
