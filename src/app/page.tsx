import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { KasirClient } from "@/components/kasir/KasirClient";

async function KasirDataLoader() {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [packages, capsters, bookings, maxOrder, setting] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.capster.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.booking.findMany({
      where: { status: { in: ["HADIR", "MENUNGGU"] } },
      include: { package: true, capster: true },
      orderBy: [{ scheduledTime: "asc" }, { createdAt: "asc" }],
    }),
    prisma.transaction.aggregate({ _max: { orderNumber: true } }),
    prisma.storeSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
  ]);

  const nextNumber = (maxOrder._max.orderNumber ?? 0) + 1;
  const nextOrderCode = `#${String(nextNumber).padStart(4, "0")}`;

  return (
    <KasirClient
      initialPackages={packages}
      initialCapsters={capsters}
      initialBookings={bookings}
      initialNextOrderCode={nextOrderCode}
      initialSetting={setting}
      cashierName={user.name}
    />
  );
}

export default function KasirPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
            Memuat data kasir...
          </div>
        }
      >
        <KasirDataLoader />
      </Suspense>
    </AppShell>
  );
}
