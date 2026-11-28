import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { kasbonCreateSchema } from "@/lib/validators";
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
    const range = req.nextUrl.searchParams.get("range") ?? "today";
    const capsterId = req.nextUrl.searchParams.get("capsterId");
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");

    const now = new Date();
    const where: Record<string, unknown> = {};

    if (capsterId && capsterId !== "ALL") {
      where.capsterId = capsterId;
    }

    if (range === "custom") {
      const gte = fromParam ? parseLocalDateStart(fromParam) : null;
      const lte = toParam ? parseLocalDateEnd(toParam) : null;
      if (gte && lte) {
        where.date = gte <= lte ? { gte, lte } : { gte: lte, lte: gte };
      } else if (gte) {
        where.date = { gte };
      } else if (lte) {
        where.date = { lte };
      }
    } else if (range === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (range === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (range === "7d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (range === "30d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (range === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const kasbons = await prisma.kasbon.findMany({
      where,
      include: {
        capster: {
          select: {
            id: true,
            name: true,
            code: true,
            photoUrl: true,
            bgColor: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

    const totalAmount = kasbons.reduce((sum, k) => sum + k.amount, 0);

    return NextResponse.json({
      data: kasbons,
      totalAmount,
      count: kasbons.length,
    });
  } catch (error) {
    console.error("GET /api/kasbon error:", error);
    return NextResponse.json({ error: "Gagal memuat data kasbon" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = kasbonCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data kasbon tidak valid" },
        { status: 400 }
      );
    }

    const capster = await prisma.capster.findUnique({
      where: { id: parsed.data.capsterId },
    });
    if (!capster) {
      return NextResponse.json({ error: "Capster tidak ditemukan" }, { status: 404 });
    }

    const user = await getCurrentUser();
    const actorName = user?.name ?? "Kasir";

    // Check if there is an active cash shift
    const activeShift = await prisma.cashShift.findFirst({
      where: { status: "OPEN" },
      select: { id: true },
    });

    let kasbonDate = new Date();
    if (parsed.data.date) {
      const customDate = new Date(parsed.data.date);
      if (!Number.isNaN(customDate.getTime())) {
        kasbonDate = customDate;
      }
    }

    const created = await prisma.kasbon.create({
      data: {
        capsterId: parsed.data.capsterId,
        amount: parsed.data.amount,
        date: kasbonDate,
        notes: parsed.data.notes ?? null,
        shiftId: activeShift?.id ?? null,
        createdBy: actorName,
      },
      include: {
        capster: {
          select: {
            id: true,
            name: true,
            code: true,
            photoUrl: true,
            bgColor: true,
          },
        },
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/kasbon error:", error);
    return NextResponse.json({ error: "Gagal mencatat kasbon" }, { status: 500 });
  }
}
