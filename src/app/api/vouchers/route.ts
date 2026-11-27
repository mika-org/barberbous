import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { voucherCreateSchema } from "@/lib/validators";
import { requireManager } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    const vouchers = await prisma.voucher.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ data: vouchers });
  } catch (error) {
    console.error("GET /api/vouchers error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar voucher" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = voucherCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data voucher tidak valid" },
        { status: 400 }
      );
    }

    const created = await prisma.voucher.create({
      data: {
        code: parsed.data.code.toUpperCase(),
        label: parsed.data.label,
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountValue,
        minSubtotal: parsed.data.minSubtotal ?? 0,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Kode promo sudah digunakan"
        : "Gagal menambah voucher promo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
