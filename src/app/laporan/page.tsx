import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { LaporanClient } from "@/components/laporan/LaporanClient";

async function LaporanDataLoader() {
  await connection();
  const [packages, drinks, capsters] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.drink.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.capster.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return <LaporanClient packages={packages} drinks={drinks} capsters={capsters} />;
}

export default function LaporanPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
            Memuat laporan penjualan...
          </div>
        }
      >
        <LaporanDataLoader />
      </Suspense>
    </AppShell>
  );
}
