import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { CapsterClient } from "@/components/capster/CapsterClient";
import type {
  PackageCommissionRow,
  HaircutCommissionHistoryItem,
} from "@/components/CapsterCommissionModal";
import type {
  CapsterFinancialExportPayload,
  ReconciliationDetailLine,
} from "@/lib/exportReconciliationCsv";

async function CapsterDataLoader() {
  await connection();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [user, setting, capsters, packages, drinks, todayTx, todayExpenses, bookings] =
    await Promise.all([
      getCurrentUser(),
      prisma.storeSetting.findUnique({ where: { id: "default" } }),
      prisma.capster.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.package.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, price: true },
      }),
      prisma.drink.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, price: true },
      }),
      prisma.transaction.findMany({
        where: { status: "SELESAI", createdAt: { gte: todayStart, lte: todayEnd } },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.storeExpense.findMany({
        where: { expenseDate: { gte: todayStart, lte: todayEnd } },
        orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      }),
      prisma.booking.findMany({
        where: { status: { in: ["HADIR", "MENUNGGU"] } },
        include: { package: true },
        orderBy: { scheduledTime: "asc" },
      }),
    ]);

  const totalRevenueAll = todayTx.reduce((s, t) => s + t.total, 0);
  const capPctById = new Map(capsters.map((c) => [c.id, c.commissionPct]));
  const validCapsterIds = new Set(capsters.map((c) => c.id));

  const allPackageLines: Array<
    HaircutCommissionHistoryItem & {
      packageId: string | null;
      capsterId: string | null;
      paymentMethod: "TUNAI" | "QRIS" | "DEBIT";
    }
  > = [];

  const allDetailLines: Array<
    ReconciliationDetailLine & { drinkId?: string | null; packageId?: string | null }
  > = [];

  let drinkRevenue = 0;
  let drinkSoldTotal = 0;

  for (const t of todayTx) {
    const fallbackCapPct = t.capsterId ? (capPctById.get(t.capsterId) ?? 40) : 40;
    if (t.items && t.items.length > 0) {
      const sub = t.items.reduce((acc, it) => acc + it.lineTotal, 0) || t.subtotal || 1;
      const txLines = t.items.map((it) => {
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
            itemType: "PACKAGE" as const,
            unitType: "BARBER" as const,
            id: it.id,
            orderCode: t.orderCode,
            createdAt: t.createdAt.toISOString(),
            customerName: t.customerName,
            paymentMethod: t.paymentMethod,
            cashierName: t.cashierName,
            packageId: it.packageId,
            drinkId: null,
            packageName: it.packageName,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            revenueShare: netPkg,
            commissionPct: cPct,
            ownerPct: oPct,
            capsterCommission: capComm,
            ownerShare: ownShare,
            capsterId: it.capsterId ?? t.capsterId,
            capsterName: it.capsterName ?? t.capsterName,
          };
        }
        return {
          itemType: "DRINK" as const,
          unitType: "KAFE" as const,
          id: it.id,
          orderCode: t.orderCode,
          createdAt: t.createdAt.toISOString(),
          customerName: t.customerName,
          paymentMethod: t.paymentMethod,
          cashierName: t.cashierName,
          packageId: null,
          drinkId: it.drinkId,
          packageName: it.packageName,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          revenueShare: computedShare,
          commissionPct: 0,
          ownerPct: 100,
          capsterCommission: 0,
          ownerShare: computedShare,
          capsterId: null,
          capsterName: "-",
        };
      });

      const sumTx = txLines.reduce((s, l) => s + l.revenueShare, 0);
      const diff = t.total - sumTx;
      if (diff !== 0 && txLines.length > 0) {
        const drinkTarget = [...txLines].reverse().find((l) => l.itemType === "DRINK");
        const target = drinkTarget ?? txLines[txLines.length - 1];
        target.revenueShare += diff;
        target.ownerShare += diff;
      }

      for (const l of txLines) {
        allDetailLines.push(l);
        if (l.itemType === "PACKAGE") {
          allPackageLines.push(l);
        } else {
          drinkRevenue += l.revenueShare;
          drinkSoldTotal += l.quantity;
        }
      }
    } else if (t.packageId) {
      const capComm =
        t.capsterCommissionTotal > 0 || t.ownerPackageShareTotal > 0
          ? t.capsterCommissionTotal
          : Math.round((t.total * fallbackCapPct) / 100);
      const ownShare = t.total - capComm;
      const fallbackLine = {
        itemType: "PACKAGE" as const,
        unitType: "BARBER" as const,
        id: t.id,
        orderCode: t.orderCode,
        createdAt: t.createdAt.toISOString(),
        customerName: t.customerName,
        paymentMethod: t.paymentMethod,
        cashierName: t.cashierName,
        packageId: t.packageId,
        drinkId: null,
        packageName: t.packageName,
        unitPrice: t.subtotal,
        quantity: 1,
        revenueShare: t.total,
        commissionPct: fallbackCapPct,
        ownerPct: 100 - fallbackCapPct,
        capsterCommission: capComm,
        ownerShare: ownShare,
        capsterId: t.capsterId,
        capsterName: t.capsterName,
      };
      allPackageLines.push(fallbackLine);
      allDetailLines.push(fallbackLine);
    }
  }

  const buildPkgBreakdown = (
    lines: typeof allPackageLines
  ): PackageCommissionRow[] =>
    packages.map((p) => {
      const pRows = lines.filter((l) => l.packageId === p.id);
      return {
        packageId: p.id,
        packageName: p.name,
        unitPrice: p.price,
        sold: pRows.reduce((s, r) => s + r.quantity, 0),
        grossAmount: pRows.reduce((s, r) => s + r.revenueShare, 0),
        ownerShareAmount: pRows.reduce((s, r) => s + r.ownerShare, 0),
        commissionAmount: pRows.reduce((s, r) => s + r.capsterCommission, 0),
      };
    });

  const enriched = capsters.map((c) => {
    const capTx = todayTx.filter((t) => t.capsterId === c.id);
    const capPkgLines = allPackageLines.filter((l) => l.capsterId === c.id);
    const revenue = capTx.reduce((s, t) => s + t.total, 0);
    const pkgRevenue = capPkgLines.reduce((s, l) => s + l.revenueShare, 0);
    const todayCommission = capPkgLines.reduce((s, l) => s + l.capsterCommission, 0);
    const todayOwnerShare = capPkgLines.reduce((s, l) => s + l.ownerShare, 0);
    const servicesCount = capPkgLines.reduce((s, l) => s + l.quantity, 0);

    const packageBreakdown = buildPkgBreakdown(capPkgLines);
    const topPackage =
      [...packageBreakdown].sort((a, b) => b.sold - a.sold)[0]?.packageName ?? "Basic";

    const sharePct = totalRevenueAll > 0 ? Math.round((revenue / totalRevenueAll) * 100) : 0;
    const schedule = bookings
      .filter((b) => b.capsterId === c.id)
      .map((b) => ({
        id: b.id,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        scheduledTime: b.scheduledTime,
        status: b.status,
        packageName: b.package.name,
      }));

    return {
      id: c.id,
      code: c.code,
      name: c.name,
      phone: c.phone,
      photoUrl: c.photoUrl,
      bgColor: c.bgColor,
      status: c.status,
      rating: c.rating,
      commissionPct: c.commissionPct,
      ownerPct: 100 - c.commissionPct,
      joinedLabel: c.joinedLabel,
      isActive: c.isActive,
      todayRevenue: revenue,
      todayPackageRevenue: pkgRevenue,
      todayCommission,
      todayOwnerShare,
      todayServices: servicesCount,
      sharePct,
      topPackage,
      schedule,
      packageBreakdown,
      haircutHistory: capPkgLines,
    };
  });

  const allCapstersBreakdown = {
    packageBreakdown: buildPkgBreakdown(allPackageLines),
    haircutHistory: allPackageLines,
  };

  const exportCapsterRows = enriched.map((c) => ({
    id: c.id,
    name: c.name,
    sold: c.todayServices,
    packageRevenue: c.todayPackageRevenue,
    ownerPct: c.ownerPct,
    commissionPct: c.commissionPct,
    ownerShareAmount: c.todayOwnerShare,
    commissionAmount: c.todayCommission,
    packageBreakdown: c.packageBreakdown,
  }));

  const unassignedPkgLines = allPackageLines.filter(
    (l) => !l.capsterId || !validCapsterIds.has(l.capsterId)
  );
  if (unassignedPkgLines.length > 0) {
    exportCapsterRows.push({
      id: "UNASSIGNED",
      name: "Siapa saja (Tanpa Capster Spesifik)",
      sold: unassignedPkgLines.reduce((s, l) => s + l.quantity, 0),
      packageRevenue: unassignedPkgLines.reduce((s, l) => s + l.revenueShare, 0),
      ownerPct: 60,
      commissionPct: 40,
      ownerShareAmount: unassignedPkgLines.reduce((s, l) => s + l.ownerShare, 0),
      commissionAmount: unassignedPkgLines.reduce((s, l) => s + l.capsterCommission, 0),
      packageBreakdown: buildPkgBreakdown(unassignedPkgLines),
    });
  }

  const packageRevenue = allPackageLines.reduce((s, l) => s + l.revenueShare, 0);
  const packageSoldTotal = allPackageLines.reduce((s, l) => s + l.quantity, 0);
  const totalOwnerPackageShare = allPackageLines.reduce((s, l) => s + l.ownerShare, 0);
  const totalCapsterShare = allPackageLines.reduce((s, l) => s + l.capsterCommission, 0);

  const totalExpenses = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const cashExpensesTotal = todayExpenses
    .filter((e) => e.paymentMethod === "TUNAI")
    .reduce((s, e) => s + e.amount, 0);
  const qrisExpensesTotal = todayExpenses
    .filter((e) => e.paymentMethod === "QRIS")
    .reduce((s, e) => s + e.amount, 0);
  const debitExpensesTotal = todayExpenses
    .filter((e) => e.paymentMethod === "DEBIT")
    .reduce((s, e) => s + e.amount, 0);

  const tunaiTx = todayTx.filter((t) => t.paymentMethod === "TUNAI");
  const qrisTx = todayTx.filter((t) => t.paymentMethod === "QRIS");
  const debitTx = todayTx.filter((t) => t.paymentMethod === "DEBIT");

  const drinkOnlyLines = allDetailLines.filter((l) => l.unitType === "KAFE");
  const drinkStats = drinks.map((d) => {
    const dRows = drinkOnlyLines.filter((l) => l.drinkId === d.id);
    return {
      id: d.id,
      name: d.name,
      price: d.price,
      sold: dRows.reduce((s, r) => s + r.quantity, 0),
      revenue: dRows.reduce((s, r) => s + r.revenueShare, 0),
    };
  });

  const todayFinancialExportPayload: CapsterFinancialExportPayload = {
    periodLabel: "Hari ini",
    totalCount: todayTx.length,
    totalRevenue: totalRevenueAll,
    packageRevenue,
    packageSoldTotal,
    drinkRevenue,
    drinkSoldTotal,
    totalOwnerPackageShare,
    totalCapsterShare,
    totalExpenses,
    cashExpensesTotal,
    qrisExpensesTotal,
    debitExpensesTotal,
    tunaiRevenue: tunaiTx.reduce((s, t) => s + t.total, 0),
    qrisRevenue: qrisTx.reduce((s, t) => s + t.total, 0),
    debitRevenue: debitTx.reduce((s, t) => s + t.total, 0),
    tunaiBarberRevenue: allPackageLines
      .filter((l) => l.paymentMethod === "TUNAI")
      .reduce((s, l) => s + l.revenueShare, 0),
    tunaiKafeRevenue: drinkOnlyLines
      .filter((l) => l.paymentMethod === "TUNAI")
      .reduce((s, l) => s + l.revenueShare, 0),
    qrisBarberRevenue: allPackageLines
      .filter((l) => l.paymentMethod === "QRIS")
      .reduce((s, l) => s + l.revenueShare, 0),
    qrisKafeRevenue: drinkOnlyLines
      .filter((l) => l.paymentMethod === "QRIS")
      .reduce((s, l) => s + l.revenueShare, 0),
    debitBarberRevenue: allPackageLines
      .filter((l) => l.paymentMethod === "DEBIT")
      .reduce((s, l) => s + l.revenueShare, 0),
    debitKafeRevenue: drinkOnlyLines
      .filter((l) => l.paymentMethod === "DEBIT")
      .reduce((s, l) => s + l.revenueShare, 0),
    tunaiCount: tunaiTx.length,
    qrisCount: qrisTx.length,
    debitCount: debitTx.length,
    capsters: exportCapsterRows,
    drinkStats,
    expenses: todayExpenses.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      category: e.category,
      paymentMethod: e.paymentMethod,
      expenseDate: e.expenseDate.toISOString(),
      createdBy: e.createdBy,
    })),
    transactionLines: allDetailLines,
    haircutHistory: allPackageLines,
  };

  return (
    <CapsterClient
      initialCapsters={enriched}
      packages={packages}
      allCapstersBreakdown={allCapstersBreakdown}
      todayFinancialExportPayload={todayFinancialExportPayload}
      storeName={setting?.storeName ?? "BARBERBOUS"}
      userRole={user?.role ?? "Kasir"}
    />
  );
}

export default function CapsterPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
            Memuat data capster...
          </div>
        }
      >
        <CapsterDataLoader />
      </Suspense>
    </AppShell>
  );
}
