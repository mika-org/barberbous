import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { memberCreateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const filter = req.nextUrl.searchParams.get("filter") ?? "ALL"; // ALL | ACTIVE | NEW_MONTH | TOP_POINTS | INACTIVE
    const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

    const where: Record<string, unknown> = {};
    if (filter === "ACTIVE") {
      where.isActive = true;
    } else if (filter === "INACTIVE") {
      where.isActive = false;
    } else if (filter === "NEW_MONTH") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      where.joinedAt = { gte: monthStart };
    }

    if (search) {
      const normalizedDigits = search.replace(/[^0-9]/g, "");
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { memberCode: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        ...(normalizedDigits.length >= 4
          ? [{ phone: { contains: normalizedDigits, mode: "insensitive" as const } }]
          : []),
      ];
    }

    const orderBy =
      filter === "TOP_POINTS"
        ? [{ points: "desc" as const }, { memberCode: "asc" as const }]
        : [{ memberCode: "asc" as const }];

    const [members, totalAgg] = await Promise.all([
      prisma.member.findMany({ where, orderBy }),
      prisma.member.aggregate({ _count: true, _sum: { points: true } }),
    ]);

    return NextResponse.json({
      data: members,
      meta: {
        totalCount: totalAgg._count,
        totalPoints: totalAgg._sum.points ?? 0,
      },
    });
  } catch (error) {
    console.error("GET /api/members error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar member" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = memberCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data member tidak valid" },
        { status: 400 }
      );
    }

    const existingMembers = await prisma.member.findMany({ select: { memberCode: true } });
    const maxCodeNum = existingMembers.reduce((max, m) => {
      const n = Number.parseInt(m.memberCode.replace(/\D/g, ""), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 71);
    const nextCode = `MBR-${String(maxCodeNum + 1).padStart(4, "0")}`;

    const created = await prisma.member.create({
      data: {
        memberCode: nextCode,
        name: parsed.data.name,
        phone: parsed.data.phone,
        birthDate: parsed.data.birthDate || null,
        notes: parsed.data.notes || null,
        points: parsed.data.points ?? 0,
        visits: 0,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "No. telepon sudah terdaftar sebagai member"
        : "Gagal mendaftarkan member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
