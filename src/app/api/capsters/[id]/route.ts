import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capsterUpdateSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/capsters/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = capsterUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data capster tidak valid" },
        { status: 400 }
      );
    }

    const updated = await prisma.capster.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/capsters/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui capster" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/capsters/[id]">) {
  try {
    const { id } = await ctx.params;
    const txCount = await prisma.transaction.count({ where: { capsterId: id } });
    if (txCount > 0) {
      const updated = await prisma.capster.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        data: updated,
        deactivated: true,
        message: "Capster memiliki riwayat transaksi sehingga dinonaktifkan dari kasir.",
      });
    }
    await prisma.booking.deleteMany({ where: { capsterId: id } });
    await prisma.capster.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/capsters/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus capster" }, { status: 400 });
  }
}
