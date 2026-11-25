import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { drinkUpdateSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/drinks/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = drinkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data minuman tidak valid" },
        { status: 400 }
      );
    }

    const updated = await prisma.drink.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/drinks/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui minuman" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/drinks/[id]">) {
  try {
    const { id } = await ctx.params;
    const txItemCount = await prisma.transactionItem.count({ where: { drinkId: id } });
    if (txItemCount > 0) {
      const updated = await prisma.drink.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        data: updated,
        deactivated: true,
        message: "Minuman memiliki riwayat transaksi sehingga dinonaktifkan dari kasir.",
      });
    }
    await prisma.drink.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/drinks/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus minuman" }, { status: 400 });
  }
}
