import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/rbac";

export async function POST() {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  try {
    await prisma.$transaction([
      prisma.transactionItem.deleteMany({}),
      prisma.transaction.deleteMany({}),
      prisma.activeService.deleteMany({}),
      prisma.booking.deleteMany({}),
      prisma.storeExpense.deleteMany({}),
      prisma.cashExpense.deleteMany({}),
      prisma.cashShift.deleteMany({}),
      prisma.stockLog.deleteMany({}),
      prisma.capster.updateMany({
        data: { status: "TERSEDIA" },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Seluruh riwayat transaksi, booking, shift, dan pengeluaran berhasil dibersihkan.",
    });
  } catch (error) {
    console.error("POST /api/backup/reset error:", error);
    return NextResponse.json(
      { error: "Gagal membersihkan data transaksi" },
      { status: 500 }
    );
  }
}
