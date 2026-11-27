import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingCreateSchema } from "@/lib/validators";

function parseTimeMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((v) => Number.parseInt(v, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

export async function GET() {
  await connection();
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["HADIR", "MENUNGGU"] },
      },
      include: {
        package: true,
        capster: true,
      },
      orderBy: [{ scheduledTime: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar booking" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bookingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data booking tidak valid" },
        { status: 400 }
      );
    }

    // Double-booking conflict check (< 25 mins apart on the same active capster)
    const targetMins = parseTimeMinutes(parsed.data.scheduledTime);
    if (targetMins >= 0) {
      const existingActive = await prisma.booking.findMany({
        where: {
          capsterId: parsed.data.capsterId,
          status: { in: ["HADIR", "MENUNGGU"] },
        },
        include: { capster: true },
      });

      const conflict = existingActive.find((b) => {
        const mins = parseTimeMinutes(b.scheduledTime);
        return mins >= 0 && Math.abs(mins - targetMins) < 25;
      });

      if (conflict) {
        return NextResponse.json(
          {
            error: `Jadwal bentrok: ${conflict.capster.name} sudah memiliki jadwal pukul ${conflict.scheduledTime} (${conflict.customerName}). Pilih selisih minimal 25 menit.`,
          },
          { status: 409 }
        );
      }
    }

    const created = await prisma.booking.create({
      data: {
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone ?? null,
        isMember: parsed.data.isMember,
        scheduledTime: parsed.data.scheduledTime,
        packageId: parsed.data.packageId,
        capsterId: parsed.data.capsterId,
        notes: parsed.data.notes ?? null,
        status: "MENUNGGU",
      },
      include: {
        package: true,
        capster: true,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ error: "Gagal membuat booking" }, { status: 400 });
  }
}
