import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memberUpdateSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = memberUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data member tidak valid" },
        { status: 400 }
      );
    }

    const updated = await prisma.member.update({
      where: { id },
      data: {
        ...parsed.data,
        birthDate: parsed.data.birthDate === "" ? null : parsed.data.birthDate,
        notes: parsed.data.notes === "" ? null : parsed.data.notes,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/members/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui data member" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  try {
    const { id } = await ctx.params;
    const txCount = await prisma.transaction.count({ where: { memberId: id } });
    if (txCount > 0) {
      const updated = await prisma.member.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        data: updated,
        deactivated: true,
        message: "Member memiliki riwayat transaksi sehingga dinonaktifkan.",
      });
    }
    await prisma.member.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/members/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus member" }, { status: 400 });
  }
}
