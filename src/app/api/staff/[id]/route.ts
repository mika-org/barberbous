import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { staffUpdateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";
import { requireManager } from "@/lib/rbac";

const safeStaffSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/staff/[id]">) {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = staffUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data pengguna tidak valid" },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      username?: string;
      passwordHash?: string;
      role?: string;
      isActive?: boolean;
    } = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.username !== undefined) updateData.username = parsed.data.username;
    if (parsed.data.password) updateData.passwordHash = hashPassword(parsed.data.password);
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    const updated = await prisma.staffUser.update({
      where: { id },
      data: updateData,
      select: safeStaffSelect,
    });
    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    const msg =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Username sudah digunakan"
        : "Gagal memperbarui pengguna";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/staff/[id]">) {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await ctx.params;
    await prisma.staffUser.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/staff/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus pengguna" }, { status: 400 });
  }
}
