import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { LandingClient } from "@/components/landing/LandingClient";

export const metadata = {
  title: "Barberbous — Hair Studio & Wellness",
  description:
    "Barbershop modern & perawatan pria terbaik di Bandung. Booking jadwal cukur online mudah tanpa antre.",
};

async function LandingDataLoader() {
  await connection();

  const [packages, capsters, setting] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        badgeColor: true,
      },
    }),
    prisma.capster.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        photoUrl: true,
        bgColor: true,
        rating: true,
      },
    }),
    prisma.storeSetting.findUnique({
      where: { id: "default" },
    }),
  ]);

  return (
    <LandingClient
      initialPackages={packages}
      initialCapsters={capsters}
      storeName={setting?.storeName ?? "BARBERBOUS"}
      storePhone={setting?.phone ?? "+62 812-0000-0000"}
      storeAddress={setting?.address ?? "Jl. Turangga No. 12, Bandung"}
    />
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-sm text-[#8D8273]">
          Memuat Barberbous...
        </div>
      }
    >
      <LandingDataLoader />
    </Suspense>
  );
}
