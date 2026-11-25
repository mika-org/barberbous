import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { MemberClient } from "@/components/member/MemberClient";

async function MemberDataLoader() {
  await connection();
  const members = await prisma.member.findMany({
    orderBy: [{ points: "desc" }, { memberCode: "asc" }],
  });

  const serialized = members.map((m) => ({
    ...m,
    lastVisitAt: m.lastVisitAt ? m.lastVisitAt.toISOString() : null,
    joinedAt: m.joinedAt.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return <MemberClient initialMembers={serialized} />;
}

export default function MemberPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
            Memuat data member...
          </div>
        }
      >
        <MemberDataLoader />
      </Suspense>
    </AppShell>
  );
}
