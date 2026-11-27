import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeServiceCreateSchema } from "@/lib/validators";

export async function GET() {
  await connection();
  try {
    const queue = await prisma.activeService.findMany({
      where: { status: "MELAYANI" },
      include: {
        package: true,
        capster: true,
        member: true,
      },
      orderBy: { startedAt: "asc" },
    });
    return NextResponse.json({ data: queue });
  } catch (error) {
    console.error("GET /api/queue error:", error);
    return NextResponse.json({ error: "Gagal memuat antrian kursi aktif" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = activeServiceCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data antrian tidak valid" },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.activeService.create({
        data: {
          customerName: parsed.data.customerName,
          isMember: parsed.data.isMember ?? false,
          memberId: parsed.data.memberId ?? null,
          packageId: parsed.data.packageId,
          capsterId: parsed.data.capsterId,
          bookingId: parsed.data.bookingId ?? null,
          notes: parsed.data.notes ?? null,
          status: "MELAYANI",
        },
        include: {
          package: true,
          capster: true,
          member: true,
        },
      });

      await tx.capster.update({
        where: { id: parsed.data.capsterId },
        data: { status: "MELAYANI" },
      });

      if (parsed.data.bookingId) {
        await tx.booking.update({
          where: { id: parsed.data.bookingId },
          data: { status: "HADIR" },
        });
      }

      return item;
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/queue error:", error);
    return NextResponse.json({ error: "Gagal memulai layanan cukur" }, { status: 400 });
  }
}
