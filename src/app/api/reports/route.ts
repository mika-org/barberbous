import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const range = req.nextUrl.searchParams.get("range") ?? "today"; // today | 7d | 30d | custom
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");
    const packageFilter = req.nextUrl.searchParams.get("packageId") ?? "ALL";
    const drinkFilter = req.nextUrl.searchParams.get("drinkId") ?? "ALL";
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

    const durationMs = Math.max(86400000, end.getTime() - start.getTime());
    const prevStart = new Date(start.getTime() - durationMs);
    const prevEnd = new Date(start.getTime() - 1);

    const [transactions, prevTransactions, packages, drinks, capsters] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          status: "SELESAI",
          createdAt: { gte: start, lte: end },
        },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.transaction.findMany({
        where: {
          status: "SELESAI",
          createdAt: { gte: prevStart, lte: prevEnd },
        },
      }),
      prisma.package.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.drink.findMany({ orderBy: { sortOrder: "asc" } }),
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

    const getTxLines = (t: (typeof transactions)[number]) => {
      if (t.items && t.items.length > 0) {
        const sub = t.items.reduce((s, it) => s + it.lineTotal, 0) || t.subtotal || 1;
        return t.items.map((it) => ({
          itemType: it.itemType,
          packageId: it.packageId,
          drinkId: it.drinkId,
          quantity: it.quantity,
          revenueShare: Math.round((it.lineTotal / sub) * t.total),
          orderType: t.orderType,
          capsterId: t.capsterId,
        }));
      }
      return [
        {
          itemType: "PACKAGE" as const,
          packageId: t.packageId,
          drinkId: null,
          quantity: 1,
          revenueShare: t.total,
          orderType: t.orderType,
          capsterId: t.capsterId,
        },
      ];
    };

    const allLines = transactions.flatMap(getTxLines);
    const packageLines = allLines.filter((l) => l.itemType === "PACKAGE");
    const drinkLines = allLines.filter((l) => l.itemType === "DRINK");

    const packageRevenue = packageLines.reduce((s, l) => s + l.revenueShare, 0);
    const packageSoldTotal = packageLines.reduce((s, l) => s + l.quantity, 0);
    const drinkRevenue = drinkLines.reduce((s, l) => s + l.revenueShare, 0);
    const drinkSoldTotal = drinkLines.reduce((s, l) => s + l.quantity, 0);

    const packageStats = packages.map((p) => {
      const rows = packageLines.filter((l) => l.packageId === p.id);
      const sold = rows.reduce((s, r) => s + r.quantity, 0);
      const revenue = rows.reduce((s, r) => s + r.revenueShare, 0);
      return {
        id: p.id,
        name: p.name,
        sold,
        revenue,
        contributionPct: packageRevenue > 0 ? Math.round((revenue / packageRevenue) * 100) : 0,
      };
    });

    const drinkStats = drinks.map((d) => {
      const rows = drinkLines.filter((l) => l.drinkId === d.id);
      const sold = rows.reduce((s, r) => s + r.quantity, 0);
      const revenue = rows.reduce((s, r) => s + r.revenueShare, 0);
      return {
        id: d.id,
        name: d.name,
        sold,
        stock: d.stock,
        revenue,
        contributionPct: drinkRevenue > 0 ? Math.round((revenue / drinkRevenue) * 100) : 0,
      };
    });

    const capsterStats = capsters.map((c) => {
      const rows = transactions.filter((t) => t.capsterId === c.id);
      const sold = rows.reduce(
        (s, t) =>
          s +
          (t.items?.length
            ? t.items
                .filter((it) => it.itemType === "PACKAGE")
                .reduce((q, it) => q + it.quantity, 0)
            : 1),
        0
      );
      const revenue = rows.reduce((s, t) => s + t.total, 0);
      return {
        id: c.id,
        name: c.name,
        sold,
        revenue,
        contributionPct: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
      };
    });

    const tunaiCount = transactions.filter((t) => t.paymentMethod === "TUNAI").length;
    const qrisCount = transactions.filter((t) => t.paymentMethod === "QRIS").length;
    const debitCount = transactions.filter((t) => t.paymentMethod === "DEBIT").length;
    const tunaiPct = totalCount > 0 ? Math.round((tunaiCount / totalCount) * 100) : 0;
    const qrisPct = totalCount > 0 ? Math.round((qrisCount / totalCount) * 100) : 0;
    const debitPct = totalCount > 0 ? Math.max(0, 100 - tunaiPct - qrisPct) : 0;

    let packageDetail = null;
    if (packageFilter !== "ALL") {
      const selectedPkg = packages.find((p) => p.id === packageFilter);
      if (selectedPkg) {
        const pkgLines = packageLines.filter((l) => l.packageId === selectedPkg.id);
        const pkgRevenue = pkgLines.reduce((s, l) => s + l.revenueShare, 0);
        const pkgSold = pkgLines.reduce((s, l) => s + l.quantity, 0);
        const pkgWalkIn = pkgLines
          .filter((l) => l.orderType === "WALK_IN")
          .reduce((s, l) => s + l.quantity, 0);
        const pkgBooking = pkgLines
          .filter((l) => l.orderType === "BOOKING")
          .reduce((s, l) => s + l.quantity, 0);
        const byCapster = capsters.map((c) => {
          const rows = pkgLines.filter((l) => l.capsterId === c.id);
          const sold = rows.reduce((s, r) => s + r.quantity, 0);
          const rev = rows.reduce((s, r) => s + r.revenueShare, 0);
          return {
            id: c.id,
            name: c.name,
            sold,
            revenue: rev,
            contributionPct: pkgRevenue > 0 ? Math.round((rev / pkgRevenue) * 100) : 0,
          };
        });
        const topCapster = [...byCapster].sort((a, b) => b.sold - a.sold)[0] ?? null;

        packageDetail = {
          package: selectedPkg,
          revenue: pkgRevenue,
          revenuePct: packageRevenue > 0 ? Math.round((pkgRevenue / packageRevenue) * 100) : 0,
          sold: pkgSold,
          totalSoldAll: packageSoldTotal,
          walkInCount: pkgWalkIn,
          bookingCount: pkgBooking,
          walkInPct: pkgSold > 0 ? Math.round((pkgWalkIn / pkgSold) * 100) : 0,
          bookingPct: pkgSold > 0 ? Math.round((pkgBooking / pkgSold) * 100) : 0,
          topCapster,
          byCapster,
        };
      }
    }

    let drinkDetail = null;
    if (drinkFilter !== "ALL") {
      const selectedDrink = drinks.find((d) => d.id === drinkFilter);
      if (selectedDrink) {
        const rows = drinkLines.filter((l) => l.drinkId === selectedDrink.id);
        const rev = rows.reduce((s, r) => s + r.revenueShare, 0);
        const sold = rows.reduce((s, r) => s + r.quantity, 0);
        const walkIn = rows
          .filter((l) => l.orderType === "WALK_IN")
          .reduce((s, l) => s + l.quantity, 0);
        const booking = rows
          .filter((l) => l.orderType === "BOOKING")
          .reduce((s, l) => s + l.quantity, 0);
        drinkDetail = {
          drink: selectedDrink,
          revenue: rev,
          revenuePct: drinkRevenue > 0 ? Math.round((rev / drinkRevenue) * 100) : 0,
          sold,
          totalSoldAll: drinkSoldTotal,
          walkInCount: walkIn,
          bookingCount: booking,
        };
      }
    }

    let capsterDetail = null;
    if (capsterFilter !== "ALL") {
      const selectedCap = capsters.find((c) => c.id === capsterFilter);
      if (selectedCap) {
        const capTx = transactions.filter((t) => t.capsterId === selectedCap.id);
        const capLines = capTx.flatMap(getTxLines).filter((l) => l.itemType === "PACKAGE");
        const capRevenue = capTx.reduce((s, t) => s + t.total, 0);
        const capSold = capLines.reduce((s, l) => s + l.quantity, 0);
        const capWalkIn = capLines
          .filter((l) => l.orderType === "WALK_IN")
          .reduce((s, l) => s + l.quantity, 0);
        const capBooking = capLines
          .filter((l) => l.orderType === "BOOKING")
          .reduce((s, l) => s + l.quantity, 0);
        const byPackage = packages.map((p) => {
          const rows = capLines.filter((l) => l.packageId === p.id);
          const sold = rows.reduce((s, r) => s + r.quantity, 0);
          const rev = rows.reduce((s, r) => s + r.revenueShare, 0);
          return {
            id: p.id,
            name: p.name,
            sold,
            revenue: rev,
            contributionPct: capRevenue > 0 ? Math.round((rev / capRevenue) * 100) : 0,
          };
        });
        const topPackage = [...byPackage].sort((a, b) => b.sold - a.sold)[0] ?? null;

        capsterDetail = {
          capster: selectedCap,
          revenue: capRevenue,
          revenuePct: totalRevenue > 0 ? Math.round((capRevenue / totalRevenue) * 100) : 0,
          sold: capSold,
          totalSoldAll: packageSoldTotal,
          walkInCount: capWalkIn,
          bookingCount: capBooking,
          walkInPct: capSold > 0 ? Math.round((capWalkIn / capSold) * 100) : 0,
          bookingPct: capSold > 0 ? Math.round((capBooking / capSold) * 100) : 0,
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
          packageRevenue,
          packageSoldTotal,
          drinkRevenue,
          drinkSoldTotal,
        },
        hourly,
        peakHour,
        packageStats,
        drinkStats,
        capsterStats,
        paymentSplit: {
          tunaiCount,
          qrisCount,
          debitCount,
          tunaiPct,
          qrisPct,
          debitPct,
        },
        packageDetail,
        drinkDetail,
        capsterDetail,
      },
    });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
