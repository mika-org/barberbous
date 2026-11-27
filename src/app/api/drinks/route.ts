import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { drinkCreateSchema } from "@/lib/validators";
import { requireManager } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    const drinks = await prisma.drink.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ data: drinks });
  } catch (error) {
    console.error("GET /api/drinks error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar minuman" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = drinkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data minuman tidak valid" },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.drink.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.drink.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category ?? "Minuman kemasan",
        price: parsed.data.price,
        stock: parsed.data.stock,
        minStock: parsed.data.minStock,
        imageUrl: parsed.data.imageUrl ?? null,
        badgeColor: parsed.data.badgeColor ?? "#EDE0CE",
        isActive: parsed.data.isActive,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Nama minuman sudah terdaftar"
        : "Gagal menambah minuman";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
