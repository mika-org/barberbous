import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashExpenseCreateSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = cashExpenseCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data pengeluaran kas tidak valid" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const created = await prisma.cashExpense.create({
      data: {
        shiftId: parsed.data.shiftId,
        amount: parsed.data.amount,
        description: parsed.data.description,
        category: parsed.data.category ?? "Operasional",
        createdBy: user?.name ?? "Kasir",
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/shifts/expenses error:", error);
    return NextResponse.json({ error: "Gagal mencatat kas keluar" }, { status: 400 });
  }
}
