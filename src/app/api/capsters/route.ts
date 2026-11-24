import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { capsterCreateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    const capsters = await prisma.capster.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ data: capsters });
  } catch (error) {
    console.error("GET /api/capsters error:", error);
    return NextResponse.json({ error: "Gagal memuat capster" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = capsterCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data capster tidak valid" },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.capster.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.capster.create({
      data: {
        name: parsed.data.name,
        photoUrl: parsed.data.photoUrl ?? null,
        bgColor: parsed.data.bgColor ?? "#C4B5E3",
        isActive: parsed.data.isActive,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error && error.message.includes("Unique constraint")
      ? "Nama capster sudah terdaftar"
      : "Gagal menambah capster";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
