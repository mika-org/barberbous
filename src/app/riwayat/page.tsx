import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { RiwayatClient } from "@/components/riwayat/RiwayatClient";

async function RiwayatDataLoader() {
  await connection();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [transactions, setting] = await Promise.all([
    prisma.transaction.findMany({
      where: { createdAt: { gte: startOfDay } },
      orderBy: [{ orderNumber: "desc" }],
      take: 100,
    }),
    prisma.storeSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
  ]);

  const serialized = transactions.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <RiwayatClient
      initialTransactions={serialized}
      storeInfo={{
        storeName: setting.storeName,
        address: setting.address,
        phone: setting.phone,
        paperSize: setting.paperSize,
        receiptFooter: setting.receiptFooter,
      }}
    />
  );
}

export default function RiwayatPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
            Memuat riwayat transaksi...
          </div>
        }
      >
        <RiwayatDataLoader />
      </Suspense>
    </AppShell>
  );
}
