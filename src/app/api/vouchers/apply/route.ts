import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { voucherApplySchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = voucherApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Kode voucher tidak valid" },
        { status: 400 }
      );
    }

    const code = parsed.data.code.toUpperCase();
    const voucher = await prisma.voucher.findUnique({ where: { code } });
    if (!voucher || !voucher.isActive) {
      return NextResponse.json(
        { error: "Kode voucher tidak ditemukan atau sudah tidak aktif" },
        { status: 404 }
      );
    }

    const discountAmount =
      voucher.discountType === "PERCENT"
        ? Math.round((parsed.data.subtotal * voucher.discountValue) / 100)
        : Math.min(parsed.data.subtotal, voucher.discountValue);

    return NextResponse.json({
      data: {
        code: voucher.code,
        label: voucher.label,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        discountAmount,
      },
    });
  } catch (error) {
    console.error("POST /api/vouchers/apply error:", error);
    return NextResponse.json({ error: "Gagal memvalidasi voucher" }, { status: 500 });
  }
}
