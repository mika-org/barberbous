import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { capsterCreateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    const withStats = req.nextUrl.searchParams.get("withStats") === "true";

    const capsters = await prisma.capster.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    if (!withStats) {
      return NextResponse.json({ data: capsters });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayTx, activeBookings] = await Promise.all([
      prisma.transaction.findMany({
        where: { status: "SELESAI", createdAt: { gte: todayStart } },
        include: { items: true },
      }),
      prisma.booking.findMany({
        where: { status: { in: ["HADIR", "MENUNGGU"] } },
        include: { package: true },
        orderBy: { scheduledTime: "asc" },
      }),
    ]);

    const totalRevenueAll = todayTx.reduce((s, t) => s + t.total, 0);

    const enriched = capsters.map((c) => {
      const capTx = todayTx.filter((t) => t.capsterId === c.id);
      const revenue = capTx.reduce((s, t) => s + t.total, 0);
      const servicesCount = capTx.reduce((s, t) => {
        const pkgItems = t.items?.filter((i) => i.itemType === "PACKAGE") ?? [];
        return s + (pkgItems.length > 0 ? pkgItems.reduce((q, i) => q + i.quantity, 0) : t.packageId ? 1 : 0);
      }, 0);

      const pkgCounts: Record<string, number> = {};
      for (const t of capTx) {
        if (t.packageName && t.packageName !== "Minuman") {
          const baseName = t.packageName.split(" ")[0];
          pkgCounts[baseName] = (pkgCounts[baseName] ?? 0) + 1;
        }
      }
      const topPackage =
        Object.entries(pkgCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Basic";

      const sharePct = totalRevenueAll > 0 ? Math.round((revenue / totalRevenueAll) * 100) : 0;
      const schedule = activeBookings.filter((b) => b.capsterId === c.id);

      return {
        ...c,
        todayRevenue: revenue,
        todayServices: servicesCount,
        sharePct,
        topPackage,
        schedule,
      };
    });

    return NextResponse.json({ data: enriched });
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

    const [maxOrder, countAll] = await Promise.all([
      prisma.capster.aggregate({ _max: { sortOrder: true } }),
      prisma.capster.count(),
    ]);

    const code = parsed.data.code ?? `CPS-${String(countAll + 1).padStart(2, "0")}`;

    const created = await prisma.capster.create({
      data: {
        code,
        name: parsed.data.name,
        phone: parsed.data.phone ?? "0812-0000-0000",
        photoUrl: parsed.data.photoUrl ?? null,
        bgColor: parsed.data.bgColor ?? "#C4B5E3",
        status: parsed.data.status ?? "TERSEDIA",
        rating: parsed.data.rating ?? 4.9,
        joinedLabel: parsed.data.joinedLabel ?? "Nov 2026",
        isActive: parsed.data.isActive,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Nama capster sudah terdaftar"
        : "Gagal menambah capster";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
