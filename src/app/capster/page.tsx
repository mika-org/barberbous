import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { CapsterClient } from "@/components/capster/CapsterClient";

async function CapsterDataLoader() {
  await connection();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [user, setting, capsters, packages, todayTx, bookings] = await Promise.all([
    getCurrentUser(),
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    prisma.capster.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.transaction.findMany({
      where: { status: "SELESAI", createdAt: { gte: todayStart } },
      include: { items: true },
    }),
    prisma.booking.findMany({
      where: { status: { in: ["HADIR", "MENUNGGU"] } },
      include: { package: true },
      orderBy: { scheduledTime: "asc" },
    }),
  ]);

  const totalRevenueAll = todayTx.reduce((s, t) => s + t.total, 0);

  const enriched = capsters.map((c) => {
    const capTx = todayTx.filter((t) => t.capsterId === c.id);
    const revenue = capTx.reduce((s, t) => s + t.total, 0);
    const pkgRevenue = capTx.reduce((s, t) => {
      if (t.items && t.items.length > 0) {
        const sub = t.items.reduce((acc, it) => acc + it.lineTotal, 0) || t.subtotal || 1;
        const pkgSum = t.items
          .filter((it) => it.itemType === "PACKAGE")
          .reduce((acc, it) => acc + it.lineTotal, 0);
        return s + Math.round((pkgSum / sub) * t.total);
      }
      return s + t.total;
    }, 0);
    const todayCommission = Math.round((pkgRevenue * c.commissionPct) / 100);

    const servicesCount = capTx.reduce((s, t) => {
      const pkgItems = t.items?.filter((i) => i.itemType === "PACKAGE") ?? [];
      return (
        s +
        (pkgItems.length > 0
          ? pkgItems.reduce((q, i) => q + i.quantity, 0)
          : t.packageId
            ? 1
            : 0)
      );
    }, 0);

    const pkgCounts: Record<string, number> = {};
    for (const t of capTx) {
      if (t.packageName && t.packageName !== "Minuman") {
        const baseName = t.packageName.split(" ")[0];
        pkgCounts[baseName] = (pkgCounts[baseName] ?? 0) + 1;
      }
    }
    const topPackage =
      Object.entries(pkgCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Basic";

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
      joinedLabel: c.joinedLabel,
      isActive: c.isActive,
      todayRevenue: revenue,
      todayCommission,
      todayServices: servicesCount,
      sharePct,
      topPackage,
      schedule,
    };
  });

  return (
    <CapsterClient
      initialCapsters={enriched}
      packages={packages}
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
