import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { drinkRestockSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/drinks/[id]/restock">) {
  await connection();
  try {
    const { id } = await ctx.params;
    const logs = await prisma.stockLog.findMany({
      where: { drinkId: id },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("GET /api/drinks/[id]/restock error:", error);
    return NextResponse.json({ error: "Gagal memuat riwayat stok" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/drinks/[id]/restock">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = drinkRestockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Jumlah restock tidak valid" },
        { status: 400 }
      );
    }

    const drink = await prisma.drink.findUnique({ where: { id } });
    if (!drink) {
      return NextResponse.json({ error: "Minuman tidak ditemukan" }, { status: 404 });
    }

    const user = await getCurrentUser();
    const newStock = drink.stock + parsed.data.delta;

    const [updatedDrink, logEntry] = await prisma.$transaction([
      prisma.drink.update({
        where: { id },
        data: { stock: newStock },
      }),
      prisma.stockLog.create({
        data: {
          drinkId: id,
          delta: parsed.data.delta,
          previousStock: drink.stock,
          newStock,
          note: parsed.data.note || "Restock kulkas",
          createdBy: user?.name ?? "Kasir",
        },
      }),
    ]);

    return NextResponse.json({ data: updatedDrink, log: logEntry });
  } catch (error) {
    console.error("POST /api/drinks/[id]/restock error:", error);
    return NextResponse.json({ error: "Gagal menambah stok minuman" }, { status: 400 });
  }
}
