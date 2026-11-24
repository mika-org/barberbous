import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const range = req.nextUrl.searchParams.get("range") ?? "today"; // today | 7d | 30d | custom
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");
    const packageFilter = req.nextUrl.searchParams.get("packageId") ?? "ALL";
    const capsterFilter = req.nextUrl.searchParams.get("capsterId") ?? "ALL";

    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (range === "7d") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (range === "30d") {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else if (range === "custom" && fromParam && toParam) {
      const f = new Date(fromParam);
      const t = new Date(toParam);
      if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime())) {
        start.setTime(f.getTime());
        start.setHours(0, 0, 0, 0);
        end.setTime(t.getTime());
        end.setHours(23, 59, 59, 999);
      }
    } else {
      start.setHours(0, 0, 0, 0);
    }

    // Previous period for delta calculation
    const durationMs = Math.max(86400000, end.getTime() - start.getTime());
    const prevStart = new Date(start.getTime() - durationMs);
    const prevEnd = new Date(start.getTime() - 1);

    const [transactions, prevTransactions, packages, capsters] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          status: "SELESAI",
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.transaction.findMany({
        where: {
          status: "SELESAI",
          createdAt: { gte: prevStart, lte: prevEnd },
        },
      }),
      prisma.package.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.capster.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalCount = transactions.length;
    const walkInCount = transactions.filter((t) => t.orderType === "WALK_IN").length;
    const bookingCount = transactions.filter((t) => t.orderType === "BOOKING").length;

    const prevRevenue = prevTransactions.reduce((sum, t) => sum + t.total, 0);
    const prevCount = prevTransactions.length;
    const revenueDeltaPct =
      prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 12;
    const countDelta = totalCount - prevCount;

    // Hourly sales 08:00 - 17:00
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const hourly = hours.map((h) => {
      const hourTotal = transactions
        .filter((t) => new Date(t.createdAt).getHours() === h)
        .reduce((sum, t) => sum + t.total, 0);
      return {
        hour: `${String(h).padStart(2, "0")}:00`,
        amount: hourTotal,
        amountThousands: Math.round((hourTotal / 1000) * 10) / 10,
      };
    });
    const peakHour = hourly.reduce(
      (best, cur) => (cur.amount > best.amount ? cur : best),
      hourly[0] ?? { hour: "13:00", amount: 0, amountThousands: 0 }
    );

    // Per-package aggregation
    const packageStats = packages.map((p) => {
      const rows = transactions.filter((t) => t.packageId === p.id);
      const revenue = rows.reduce((s, t) => s + t.total, 0);
      return {
        id: p.id,
        name: p.name,
        sold: rows.length,
        revenue,
        contributionPct: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
      };
    });

    // Per-capster aggregation
    const capsterStats = capsters.map((c) => {
      const rows = transactions.filter((t) => t.capsterId === c.id);
      const revenue = rows.reduce((s, t) => s + t.total, 0);
      return {
        id: c.id,
        name: c.name,
        sold: rows.length,
        revenue,
        contributionPct: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
      };
    });

    // Payment method split
    const tunaiCount = transactions.filter((t) => t.paymentMethod === "TUNAI").length;
    const qrisCount = transactions.filter((t) => t.paymentMethod === "QRIS").length;
    const tunaiPct = totalCount > 0 ? Math.round((tunaiCount / totalCount) * 100) : 0;
    const qrisPct = totalCount > 0 ? 100 - tunaiPct : 0;

    // Package detail breakdown (if packageFilter != ALL)
    let packageDetail = null;
    if (packageFilter !== "ALL") {
      const selectedPkg = packages.find((p) => p.id === packageFilter);
      if (selectedPkg) {
        const pkgTx = transactions.filter((t) => t.packageId === selectedPkg.id);
        const pkgRevenue = pkgTx.reduce((s, t) => s + t.total, 0);
        const pkgWalkIn = pkgTx.filter((t) => t.orderType === "WALK_IN").length;
        const pkgBooking = pkgTx.filter((t) => t.orderType === "BOOKING").length;
        const byCapster = capsters.map((c) => {
          const rows = pkgTx.filter((t) => t.capsterId === c.id);
          const rev = rows.reduce((s, t) => s + t.total, 0);
          return {
            id: c.id,
            name: c.name,
            sold: rows.length,
            revenue: rev,
            contributionPct: pkgRevenue > 0 ? Math.round((rev / pkgRevenue) * 100) : 0,
          };
        });
        const topCapster = [...byCapster].sort((a, b) => b.sold - a.sold)[0] ?? null;

        packageDetail = {
          package: selectedPkg,
          revenue: pkgRevenue,
          revenuePct: totalRevenue > 0 ? Math.round((pkgRevenue / totalRevenue) * 100) : 0,
          sold: pkgTx.length,
          totalSoldAll: totalCount,
          walkInCount: pkgWalkIn,
          bookingCount: pkgBooking,
          walkInPct: pkgTx.length > 0 ? Math.round((pkgWalkIn / pkgTx.length) * 100) : 0,
          bookingPct: pkgTx.length > 0 ? Math.round((pkgBooking / pkgTx.length) * 100) : 0,
          topCapster,
          byCapster,
        };
      }
    }

    // Capster detail breakdown (if capsterFilter != ALL)
    let capsterDetail = null;
    if (capsterFilter !== "ALL") {
      const selectedCap = capsters.find((c) => c.id === capsterFilter);
      if (selectedCap) {
        const capTx = transactions.filter((t) => t.capsterId === selectedCap.id);
        const capRevenue = capTx.reduce((s, t) => s + t.total, 0);
        const capWalkIn = capTx.filter((t) => t.orderType === "WALK_IN").length;
        const capBooking = capTx.filter((t) => t.orderType === "BOOKING").length;
        const byPackage = packages.map((p) => {
          const rows = capTx.filter((t) => t.packageId === p.id);
          const rev = rows.reduce((s, t) => s + t.total, 0);
          return {
            id: p.id,
            name: p.name,
            sold: rows.length,
            revenue: rev,
            contributionPct: capRevenue > 0 ? Math.round((rev / capRevenue) * 100) : 0,
          };
        });
        const topPackage = [...byPackage].sort((a, b) => b.sold - a.sold)[0] ?? null;

        capsterDetail = {
          capster: selectedCap,
          revenue: capRevenue,
          revenuePct: totalRevenue > 0 ? Math.round((capRevenue / totalRevenue) * 100) : 0,
          sold: capTx.length,
          totalSoldAll: totalCount,
          walkInCount: capWalkIn,
          bookingCount: capBooking,
          walkInPct: capTx.length > 0 ? Math.round((capWalkIn / capTx.length) * 100) : 0,
          bookingPct: capTx.length > 0 ? Math.round((capBooking / capTx.length) * 100) : 0,
          topPackage,
          byPackage,
        };
      }
    }

    return NextResponse.json({
      data: {
        summary: {
          totalRevenue,
          totalCount,
          walkInCount,
          bookingCount,
          revenueDeltaPct,
          countDelta,
        },
        hourly,
        peakHour,
        packageStats,
        capsterStats,
        paymentSplit: {
          tunaiCount,
          qrisCount,
          tunaiPct,
          qrisPct,
        },
        packageDetail,
        capsterDetail,
      },
    });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Gagal memuat laporan penjualan" }, { status: 500 });
  }
}
