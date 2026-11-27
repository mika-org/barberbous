import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await connection();
  try {
    const [packages, drinks, capsters, members, vouchers, bookings, shifts, stockLogs, transactions, settings, staff] =
      await Promise.all([
        prisma.package.findMany(),
        prisma.drink.findMany(),
        prisma.capster.findMany(),
        prisma.member.findMany(),
        prisma.voucher.findMany(),
        prisma.booking.findMany(),
        prisma.cashShift.findMany({ include: { expenses: true } }),
        prisma.stockLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
        prisma.transaction.findMany({ include: { items: true }, orderBy: { orderNumber: "desc" } }),
        prisma.storeSetting.findMany(),
        prisma.staffUser.findMany({
          select: { id: true, name: true, username: true, email: true, role: true, isActive: true },
        }),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      app: "BARBERBOUS POS V2",
      data: {
        packages,
        drinks,
        capsters,
        members,
        vouchers,
        bookings,
        shifts,
        stockLogs,
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
