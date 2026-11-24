import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { staffCreateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";

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

export async function GET() {
  await connection();
  try {
    const staff = await prisma.staffUser.findMany({
      select: safeStaffSelect,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: staff });
  } catch (error) {
    console.error("GET /api/staff error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar pengguna" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = staffCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data pengguna tidak valid" },
        { status: 400 }
      );
    }

    const created = await prisma.staffUser.create({
      data: {
        name: parsed.data.name,
        username: parsed.data.username,
        passwordHash: hashPassword(parsed.data.password),
        email: parsed.data.email || null,
        role: parsed.data.role,
        isActive: parsed.data.isActive,
      },
      select: safeStaffSelect,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Username sudah digunakan"
        : "Gagal menambah pengguna";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
