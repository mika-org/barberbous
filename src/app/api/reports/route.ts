import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";

function parseLocalYmd(ymd: string): [number, number, number] | null {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2]];
}

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
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (range === "7d") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    } else if (range === "30d") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    } else if (range === "custom" && fromParam && toParam) {
      const f = parseLocalYmd(fromParam);
      const t = parseLocalYmd(toParam);
      if (f && t) {
        const sCandidate = new Date(f[0], f[1] - 1, f[2], 0, 0, 0, 0);
        const eCandidate = new Date(t[0], t[1] - 1, t[2], 23, 59, 59, 999);
        if (sCandidate <= eCandidate) {
          start = sCandidate;
          end = eCandidate;
        } else {
          start = new Date(t[0], t[1] - 1, t[2], 0, 0, 0, 0);
          end = new Date(f[0], f[1] - 1, f[2], 23, 59, 59, 999);
        }
      }
    }

    const durationMs = Math.max(86400000, end.getTime() - start.getTime());
    const prevStart = new Date(start.getTime() - durationMs);
    const prevEnd = new Date(start.getTime() - 1);

    const [transactions, prevTransactions, expenses, packages, drinks, capsters, kasbons] =
      await Promise.all([
        prisma.transaction.findMany({
          where: {
            status: "SELESAI",
            createdAt: { gte: start, lte: end },
          },
          include: { items: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.transaction.findMany({
          where: {
            status: "SELESAI",
            createdAt: { gte: prevStart, lte: prevEnd },
          },
        }),
        prisma.storeExpense.findMany({
          where: {
            expenseDate: { gte: start, lte: end },
          },
          orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
        }),
        prisma.package.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.drink.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.capster.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.kasbon.findMany({
          where: {
            date: { gte: start, lte: end },
          },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        }),
      ]);

    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalCount = transactions.length;
    const walkInCount = transactions.filter((t) => t.orderType === "WALK_IN").length;
    const bookingCount = transactions.filter((t) => t.orderType === "BOOKING").length;

    const prevRevenue = prevTransactions.reduce((sum, t) => sum + t.total, 0);
    const prevCount = prevTransactions.length;
    const revenueDeltaPct =
      prevRevenue > 0
        ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
        : totalRevenue > 0
          ? 100
          : 0;
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

    const capsterPctById = new Map(capsters.map((c) => [c.id, c.commissionPct]));
    const validCapsterIds = new Set(capsters.map((c) => c.id));

    // Normalize every transaction item with STRICT conservation of t.total (Barber = PACKAGE, Kafe = DRINK)
    const getTxLines = (t: (typeof transactions)[number]) => {
      const fallbackCapPct = t.capsterId ? (capsterPctById.get(t.capsterId) ?? 40) : 40;
      if (t.items && t.items.length > 0) {
        const sub = t.items.reduce((s, it) => s + it.lineTotal, 0) || t.subtotal || 1;
        const lines = t.items.map((it) => {
          const computedShare = Math.round((it.lineTotal / sub) * t.total);
          if (it.itemType === "PACKAGE") {
            const netPkg = it.netPackageAmount > 0 ? it.netPackageAmount : computedShare;
            const cPct = it.commissionPct > 0 ? it.commissionPct : fallbackCapPct;
            const oPct = 100 - cPct;
            const capComm =
              it.capsterCommission > 0 || it.ownerShare > 0
                ? it.capsterCommission
                : Math.round((netPkg * cPct) / 100);
            const ownShare = netPkg - capComm;

            return {
              id: it.id,
              orderCode: t.orderCode,
              createdAt: t.createdAt.toISOString(),
              customerName: t.customerName,
              paymentMethod: t.paymentMethod,
              cashierName: t.cashierName,
              itemType: it.itemType,
              unitType: "BARBER" as const,
              packageId: it.packageId,
              packageName: it.packageName,
              drinkId: it.drinkId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              revenueShare: netPkg,
              commissionPct: cPct,
              ownerPct: oPct,
              capsterCommission: capComm,
              ownerShare: ownShare,
              orderType: t.orderType,
              capsterId: it.capsterId ?? t.capsterId,
              capsterName: it.capsterName ?? t.capsterName,
            };
          }
          return {
            id: it.id,
            orderCode: t.orderCode,
            createdAt: t.createdAt.toISOString(),
            customerName: t.customerName,
            paymentMethod: t.paymentMethod,
            cashierName: t.cashierName,
            itemType: it.itemType,
            unitType: "KAFE" as const,
            packageId: it.packageId,
            drinkId: it.drinkId,
            packageName: it.packageName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            revenueShare: computedShare,
            commissionPct: 0,
            ownerPct: 100,
            capsterCommission: 0,
            ownerShare: computedShare,
            orderType: t.orderType,
            capsterId: null,
            capsterName: "-",
          };
        });

        const currentSum = lines.reduce((s, l) => s + l.revenueShare, 0);
        const diff = t.total - currentSum;
        if (diff !== 0 && lines.length > 0) {
          const drinkTarget = [...lines].reverse().find((l) => l.itemType === "DRINK");
          const target = drinkTarget ?? lines[lines.length - 1];
          target.revenueShare += diff;
          target.ownerShare += diff;
        }
        return lines;
      }

      const capComm =
        t.capsterCommissionTotal > 0 || t.ownerPackageShareTotal > 0
          ? t.capsterCommissionTotal
          : Math.round((t.total * fallbackCapPct) / 100);
      const ownShare = t.total - capComm;

      return [
        {
          id: t.id,
          orderCode: t.orderCode,
          createdAt: t.createdAt.toISOString(),
          customerName: t.customerName,
          paymentMethod: t.paymentMethod,
          cashierName: t.cashierName,
          itemType: "PACKAGE" as const,
          unitType: "BARBER" as const,
          packageId: t.packageId,
          packageName: t.packageName,
          drinkId: null,
          quantity: 1,
          unitPrice: t.subtotal,
          revenueShare: t.total,
          commissionPct: fallbackCapPct,
          ownerPct: 100 - fallbackCapPct,
          capsterCommission: capComm,
          ownerShare: ownShare,
          orderType: t.orderType,
          capsterId: t.capsterId,
          capsterName: t.capsterName,
        },
      ];
    };

    const allLines = transactions.flatMap(getTxLines);
    const packageLines = allLines.filter((l) => l.itemType === "PACKAGE");
    const drinkLines = allLines.filter((l) => l.itemType === "DRINK");

    // Unit Barber (Paket) vs Unit Kafe (Minuman)
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
        price: p.price,
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
        category: d.category,
        price: d.price,
        sold,
        stock: d.stock,
        revenue,
        contributionPct: drinkRevenue > 0 ? Math.round((revenue / drinkRevenue) * 100) : 0,
      };
    });

    const buildPackageCommissionBreakdown = (lines: typeof packageLines) => {
      return packages.map((p) => {
        const pRows = lines.filter((l) => l.packageId === p.id);
        const sold = pRows.reduce((s, r) => s + r.quantity, 0);
        const grossAmount = pRows.reduce((s, r) => s + r.revenueShare, 0);
        const commissionAmount = pRows.reduce((s, r) => s + r.capsterCommission, 0);
        const ownerShareAmount = pRows.reduce((s, r) => s + r.ownerShare, 0);
        return {
          packageId: p.id,
          packageName: p.name,
          unitPrice: p.price,
          sold,
          grossAmount,
          ownerShareAmount,
          commissionAmount,
        };
      });
    };

    const capsterStats = capsters.map((c) => {
      const rows = transactions.filter((t) => t.capsterId === c.id);
      const capPkgLines = packageLines.filter((l) => l.capsterId === c.id);
      const sold = capPkgLines.reduce((s, l) => s + l.quantity, 0);
      const revenue = rows.reduce((s, t) => s + t.total, 0);
      const pkgRevForCapster = capPkgLines.reduce((s, l) => s + l.revenueShare, 0);
      const commissionAmount = capPkgLines.reduce((s, l) => s + l.capsterCommission, 0);
      const ownerShareAmount = capPkgLines.reduce((s, l) => s + l.ownerShare, 0);

      const capKasbons = kasbons.filter((k) => k.capsterId === c.id);
      const kasbonAmount = capKasbons.reduce((s, k) => s + k.amount, 0);
      const netCommissionAmount = commissionAmount - kasbonAmount;

      return {
        id: c.id,
        name: c.name,
        sold,
        revenue,
        packageRevenue: pkgRevForCapster,
        commissionPct: c.commissionPct,
        ownerPct: 100 - c.commissionPct,
        commissionAmount,
        ownerShareAmount,
        kasbonAmount,
        netCommissionAmount,
        contributionPct: packageRevenue > 0 ? Math.round((pkgRevForCapster / packageRevenue) * 100) : 0,
        packageBreakdown: buildPackageCommissionBreakdown(capPkgLines),
        haircutHistory: capPkgLines.slice(0, 200),
      };
    });

    const unassignedPkgLines = packageLines.filter(
      (l) => !l.capsterId || !validCapsterIds.has(l.capsterId)
    );
    if (unassignedPkgLines.length > 0) {
      const uSold = unassignedPkgLines.reduce((s, l) => s + l.quantity, 0);
      const uPkgRev = unassignedPkgLines.reduce((s, l) => s + l.revenueShare, 0);
      const uComm = unassignedPkgLines.reduce((s, l) => s + l.capsterCommission, 0);
      const uOwn = unassignedPkgLines.reduce((s, l) => s + l.ownerShare, 0);
      capsterStats.push({
        id: "UNASSIGNED",
        name: "Siapa saja (Tanpa Capster Spesifik)",
        sold: uSold,
        revenue: uPkgRev,
        packageRevenue: uPkgRev,
        commissionPct: 40,
        ownerPct: 60,
        commissionAmount: uComm,
        ownerShareAmount: uOwn,
        kasbonAmount: 0,
        netCommissionAmount: uComm,
        contributionPct: packageRevenue > 0 ? Math.round((uPkgRev / packageRevenue) * 100) : 0,
        packageBreakdown: buildPackageCommissionBreakdown(unassignedPkgLines),
        haircutHistory: unassignedPkgLines.slice(0, 200),
      });
    }

    const totalKasbonShare = kasbons.reduce((s, k) => s + k.amount, 0);

    const allCapstersBreakdown = {
      packageBreakdown: buildPackageCommissionBreakdown(packageLines),
      haircutHistory: packageLines.slice(0, 500),
      totalKasbon: totalKasbonShare,
    };

    const totalCapsterShare = packageLines.reduce((s, l) => s + l.capsterCommission, 0);
    const netCapsterShare = totalCapsterShare - totalKasbonShare;
    const totalOwnerPackageShare = packageLines.reduce((s, l) => s + l.ownerShare, 0);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const cashExpensesTotal = expenses
      .filter((e) => e.paymentMethod === "TUNAI")
      .reduce((s, e) => s + e.amount, 0);
    const qrisExpensesTotal = expenses
      .filter((e) => e.paymentMethod === "QRIS")
      .reduce((s, e) => s + e.amount, 0);
    const debitExpensesTotal = expenses
      .filter((e) => e.paymentMethod === "DEBIT")
      .reduce((s, e) => s + e.amount, 0);
    const nonCashExpensesTotal = qrisExpensesTotal + debitExpensesTotal;

    const totalOwnerGross = totalOwnerPackageShare + drinkRevenue;
    const cashBeforeCapsterPayout = totalRevenue - totalExpenses;
    const netOwnerIncome = totalOwnerGross - totalExpenses;

    const tunaiTx = transactions.filter((t) => t.paymentMethod === "TUNAI");
    const qrisTx = transactions.filter((t) => t.paymentMethod === "QRIS");
    const debitTx = transactions.filter((t) => t.paymentMethod === "DEBIT");

    const tunaiCount = tunaiTx.length;
    const qrisCount = qrisTx.length;
    const debitCount = debitTx.length;

    const tunaiRevenue = tunaiTx.reduce((s, t) => s + t.total, 0);
    const qrisRevenue = qrisTx.reduce((s, t) => s + t.total, 0);
    const debitRevenue = debitTx.reduce((s, t) => s + t.total, 0);

    // Barber vs Kafe split per payment method (100% conserved to tunaiRevenue/qrisRevenue/debitRevenue)
    const tunaiBarberRevenue = packageLines
      .filter((l) => l.paymentMethod === "TUNAI")
      .reduce((s, l) => s + l.revenueShare, 0);
    const tunaiKafeRevenue = drinkLines
      .filter((l) => l.paymentMethod === "TUNAI")
      .reduce((s, l) => s + l.revenueShare, 0);

    const qrisBarberRevenue = packageLines
      .filter((l) => l.paymentMethod === "QRIS")
      .reduce((s, l) => s + l.revenueShare, 0);
    const qrisKafeRevenue = drinkLines
      .filter((l) => l.paymentMethod === "QRIS")
      .reduce((s, l) => s + l.revenueShare, 0);

    const debitBarberRevenue = packageLines
      .filter((l) => l.paymentMethod === "DEBIT")
      .reduce((s, l) => s + l.revenueShare, 0);
    const debitKafeRevenue = drinkLines
      .filter((l) => l.paymentMethod === "DEBIT")
      .reduce((s, l) => s + l.revenueShare, 0);

    const tunaiPct = totalRevenue > 0 ? Math.round((tunaiRevenue / totalRevenue) * 100) : 0;
    const qrisPct = totalRevenue > 0 ? Math.round((qrisRevenue / totalRevenue) * 100) : 0;
    const debitPct = totalRevenue > 0 ? Math.max(0, 100 - tunaiPct - qrisPct) : 0;

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
        const capLines = packageLines.filter((l) => l.capsterId === selectedCap.id);
        const capRevenue = capTx.reduce((s, t) => s + t.total, 0);
        const capSold = capLines.reduce((s, l) => s + l.quantity, 0);
        const capWalkIn = capLines
          .filter((l) => l.orderType === "WALK_IN")
          .reduce((s, l) => s + l.quantity, 0);
        const capBooking = capLines
          .filter((l) => l.orderType === "BOOKING")
          .reduce((s, l) => s + l.quantity, 0);
        const byPackage = buildPackageCommissionBreakdown(capLines).map((bp) => ({
          id: bp.packageId,
          name: bp.packageName,
          sold: bp.sold,
          revenue: bp.grossAmount,
          ownerShareAmount: bp.ownerShareAmount,
          commissionAmount: bp.commissionAmount,
          contributionPct: capRevenue > 0 ? Math.round((bp.grossAmount / capRevenue) * 100) : 0,
        }));
        const topPackage = [...byPackage].sort((a, b) => b.sold - a.sold)[0] ?? null;
        const pkgRevForCap = capLines.reduce((s, l) => s + l.revenueShare, 0);
        const capCommission = capLines.reduce((s, l) => s + l.capsterCommission, 0);
        const capOwnerShare = capLines.reduce((s, l) => s + l.ownerShare, 0);

        const capKas = kasbons.filter((k) => k.capsterId === selectedCap.id);
        const capKasbonAmount = capKas.reduce((s, k) => s + k.amount, 0);
        const capNetCommission = capCommission - capKasbonAmount;

        capsterDetail = {
          capster: selectedCap,
          revenue: capRevenue,
          packageRevenue: pkgRevForCap,
          commissionPct: selectedCap.commissionPct,
          ownerPct: 100 - selectedCap.commissionPct,
          commissionAmount: capCommission,
          ownerShareAmount: capOwnerShare,
          kasbonAmount: capKasbonAmount,
          netCommissionAmount: capNetCommission,
          kasbons: capKas,
          revenuePct: totalRevenue > 0 ? Math.round((capRevenue / totalRevenue) * 100) : 0,
          sold: capSold,
          totalSoldAll: packageSoldTotal,
          walkInCount: capWalkIn,
          bookingCount: capBooking,
          walkInPct: capSold > 0 ? Math.round((capWalkIn / capSold) * 100) : 0,
          bookingPct: capSold > 0 ? Math.round((capBooking / capSold) * 100) : 0,
          topPackage,
          byPackage,
          packageBreakdown: buildPackageCommissionBreakdown(capLines),
          haircutHistory: capLines.slice(0, 200),
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
          barberRevenue: packageRevenue,
          barberSoldTotal: packageSoldTotal,
          drinkRevenue,
          drinkSoldTotal,
          kafeRevenue: drinkRevenue,
          kafeSoldTotal: drinkSoldTotal,
          totalOwnerPackageShare,
          totalCapsterShare,
          totalKasbonShare,
          netCapsterShare,
          totalOwnerGross,
          totalExpenses,
          cashExpensesTotal,
          qrisExpensesTotal,
          debitExpensesTotal,
          nonCashExpensesTotal,
          cashBeforeCapsterPayout,
          netOwnerIncome,
        },
        hourly,
        peakHour,
        packageStats,
        drinkStats,
        capsterStats,
        allCapstersBreakdown,
        transactionLines: allLines.slice(0, 5000),
        paymentSplit: {
          tunaiCount,
          qrisCount,
          debitCount,
          tunaiRevenue,
          qrisRevenue,
          debitRevenue,
          tunaiBarberRevenue,
          tunaiKafeRevenue,
          qrisBarberRevenue,
          qrisKafeRevenue,
          debitBarberRevenue,
          debitKafeRevenue,
          netCashRevenue: tunaiRevenue - cashExpensesTotal,
          netQrisRevenue: qrisRevenue - qrisExpensesTotal,
          netDebitRevenue: debitRevenue - debitExpensesTotal,
          tunaiPct,
          qrisPct,
          debitPct,
        },
        expenses: expenses.slice(0, 2000),
        recentExpenses: expenses.slice(0, 10),
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
