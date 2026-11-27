import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { PengeluaranClient } from "@/components/pengeluaran/PengeluaranClient";

async function PengeluaranDataLoader() {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const expenses = await prisma.storeExpense.findMany({
    where: { expenseDate: { gte: startOfDay } },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const serialized = expenses.map((e) => ({
    ...e,
    expenseDate: e.expenseDate.toISOString(),
    createdAt: e.createdAt.toISOString(),
  }));

  return <PengeluaranClient initialExpenses={serialized} />;
}

export default function PengeluaranPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
            Memuat data pengeluaran...
          </div>
        }
      >
        <PengeluaranDataLoader />
      </Suspense>
    </AppShell>
  );
}
