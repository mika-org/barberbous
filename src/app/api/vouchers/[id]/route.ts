import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { voucherUpdateSchema } from "@/lib/validators";
import { requireManager } from "@/lib/rbac";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/vouchers/[id]">) {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = voucherUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data voucher tidak valid" },
        { status: 400 }
      );
    }

    const updated = await prisma.voucher.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.code ? { code: parsed.data.code.toUpperCase() } : {}),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/vouchers/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui voucher" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/vouchers/[id]">) {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await ctx.params;
    await prisma.voucher.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/vouchers/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus voucher" }, { status: 400 });
  }
}
