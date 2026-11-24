import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { SetelanClient } from "@/components/setelan/SetelanClient";

async function SetelanDataLoader() {
  await connection();
  const [setting, staff] = await Promise.all([
    prisma.storeSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
    prisma.staffUser.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return <SetelanClient initialSetting={setting} initialStaff={staff} />;
}

export default function SetelanPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
            Memuat setelan...
          </div>
        }
      >
        <SetelanDataLoader />
      </Suspense>
    </AppShell>
  );
}
