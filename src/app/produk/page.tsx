import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { ProdukClient } from "@/components/produk/ProdukClient";

async function ProdukDataLoader() {
  await connection();
  const [user, packages, drinks] = await Promise.all([
    getCurrentUser(),
    prisma.package.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.drink.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <ProdukClient
      initialPackages={packages}
      initialDrinks={drinks}
      userRole={user?.role ?? "Kasir"}
    />
  );
}

export default function ProdukPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
            Memuat produk &amp; minuman...
          </div>
        }
      >
        <ProdukDataLoader />
      </Suspense>
    </AppShell>
  );
}
