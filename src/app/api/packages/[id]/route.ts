import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { packageUpdateSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/packages/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = packageUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data paket tidak valid" },
        { status: 400 }
      );
    }

    const updated = await prisma.package.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/packages/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui paket" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/packages/[id]">) {
  try {
    const { id } = await ctx.params;
    const txCount = await prisma.transaction.count({ where: { packageId: id } });
    if (txCount > 0) {
      // Soft-deactivate if referenced by historical transactions
      const updated = await prisma.package.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        data: updated,
        deactivated: true,
        message: "Paket memiliki riwayat transaksi sehingga dinonaktifkan dari kasir.",
      });
    }
    await prisma.booking.deleteMany({ where: { packageId: id } });
    await prisma.package.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/packages/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus paket" }, { status: 400 });
  }
}
