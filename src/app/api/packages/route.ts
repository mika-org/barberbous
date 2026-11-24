import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { packageCreateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    const packages = await prisma.package.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ data: packages });
  } catch (error) {
    console.error("GET /api/packages error:", error);
    return NextResponse.json({ error: "Gagal memuat paket" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = packageCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data paket tidak valid", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.package.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.package.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        imageUrl: parsed.data.imageUrl ?? null,
        badgeColor: parsed.data.badgeColor ?? "#EDE0CE",
        isActive: parsed.data.isActive,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error && error.message.includes("Unique constraint")
      ? "Nama paket sudah terdaftar"
      : "Gagal menambah paket";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
