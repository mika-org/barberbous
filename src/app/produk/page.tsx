import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ProdukClient } from "@/components/produk/ProdukClient";

async function ProdukDataLoader() {
  await connection();
  const [packages, capsters] = await Promise.all([
    prisma.package.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.capster.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return <ProdukClient initialPackages={packages} initialCapsters={capsters} />;
}

export default function ProdukPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
            Memuat produk &amp; capster...
          </div>
        }
      >
        <ProdukDataLoader />
      </Suspense>
    </AppShell>
  );
}
