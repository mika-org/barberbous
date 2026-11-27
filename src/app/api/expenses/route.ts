import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { storeExpenseCreateSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";

function parseLocalDateStart(ymd: string): Date | null {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function parseLocalDateEnd(ymd: string): Date | null {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export async function GET(req: NextRequest) {
  await connection();
  try {
    // range: today | yesterday | 7d | 30d | month | custom | all
    const range = req.nextUrl.searchParams.get("range") ?? "today";
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");
    const category = req.nextUrl.searchParams.get("category") ?? "ALL";
    const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

    const now = new Date();
    const where: Record<string, unknown> = {};

    if (range === "custom") {
      const gte = fromParam ? parseLocalDateStart(fromParam) : null;
      const lte = toParam ? parseLocalDateEnd(toParam) : null;
      if (gte && lte) {
        where.expenseDate = gte <= lte ? { gte, lte } : { gte: lte, lte: gte };
      } else if (gte) {
        where.expenseDate = { gte };
      } else if (lte) {
        where.expenseDate = { lte };
      }
    } else if (range === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    } else if (range === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    } else if (range === "7d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    } else if (range === "30d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    } else if (range === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    }

    if (category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { createdBy: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const expenses = await prisma.storeExpense.findMany({
      where,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      take: 1000,
    });

    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const cashTotal = expenses
      .filter((e) => e.paymentMethod === "TUNAI")
      .reduce((s, e) => s + e.amount, 0);
    const qrisTotal = expenses
      .filter((e) => e.paymentMethod === "QRIS")
      .reduce((s, e) => s + e.amount, 0);
    const debitTotal = expenses
      .filter((e) => e.paymentMethod === "DEBIT")
      .reduce((s, e) => s + e.amount, 0);
    const nonCashTotal = qrisTotal + debitTotal;

    const categoryTotals: Record<string, number> = {};
    for (const exp of expenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] ?? 0) + exp.amount;
    }
    const topCategory =
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    return NextResponse.json({
      data: expenses,
      meta: {
        count: expenses.length,
        totalAmount,
        cashTotal,
        qrisTotal,
        debitTotal,
        nonCashTotal,
        topCategory,
      },
    });
  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar pengeluaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = storeExpenseCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data pengeluaran tidak valid" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    let expenseDate = new Date();
    if (parsed.data.expenseDate) {
      // If YYYY-MM-DD is provided, preserve current time of day on that local date
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.expenseDate)) {
        const [y, m, d] = parsed.data.expenseDate.split("-").map(Number);
        const now = new Date();
        expenseDate = new Date(
          y,
          m - 1,
          d,
          now.getHours(),
          now.getMinutes(),
          now.getSeconds()
        );
      } else {
        const parsedDt = new Date(parsed.data.expenseDate);
        if (!Number.isNaN(parsedDt.getTime())) {
          expenseDate = parsedDt;
        }
      }
    }

    const created = await prisma.storeExpense.create({
      data: {
        amount: parsed.data.amount,
        description: parsed.data.description,
        category: parsed.data.category,
        paymentMethod: parsed.data.paymentMethod,
        notes: parsed.data.notes ?? null,
        createdBy: user?.name ?? "Kasir",
        expenseDate,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json({ error: "Gagal menyimpan pengeluaran" }, { status: 400 });
  }
}
