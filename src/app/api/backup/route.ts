import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [packages, capsters, vouchers, bookings, transactions, settings, staff] =
      await Promise.all([
        prisma.package.findMany(),
        prisma.capster.findMany(),
        prisma.voucher.findMany(),
        prisma.booking.findMany(),
        prisma.transaction.findMany({ orderBy: { orderNumber: "desc" } }),
        prisma.storeSetting.findMany(),
        prisma.staffUser.findMany(),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      app: "BARBERBOUS POS",
      data: {
        packages,
        capsters,
        vouchers,
        bookings,
        transactions,
        settings,
        staff,
      },
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="barberbous-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json({ error: "Gagal mengekspor cadangan data" }, { status: 500 });
  }
}
