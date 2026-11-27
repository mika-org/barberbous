import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingUpdateSchema } from "@/lib/validators";

function parseTimeMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((v) => Number.parseInt(v, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/bookings/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = bookingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data booking tidak valid" },
        { status: 400 }
      );
    }

    const current = await prisma.booking.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
    }

    const nextCapsterId = parsed.data.capsterId ?? current.capsterId;
    const nextTime = parsed.data.scheduledTime ?? current.scheduledTime;
    if (parsed.data.capsterId || parsed.data.scheduledTime) {
      const targetMins = parseTimeMinutes(nextTime);
      if (targetMins >= 0) {
        const others = await prisma.booking.findMany({
          where: {
            id: { not: id },
            capsterId: nextCapsterId,
            status: { in: ["HADIR", "MENUNGGU"] },
          },
          include: { capster: true },
        });
        const conflict = others.find((b) => {
          const mins = parseTimeMinutes(b.scheduledTime);
          return mins >= 0 && Math.abs(mins - targetMins) < 25;
        });
        if (conflict) {
          return NextResponse.json(
            {
              error: `Jadwal bentrok: ${conflict.capster.name} sudah memiliki jadwal pukul ${conflict.scheduledTime} (${conflict.customerName}).`,
            },
            { status: 409 }
          );
        }
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: parsed.data,
      include: {
        package: true,
        capster: true,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui booking" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/bookings/[id]">) {
  try {
    const { id } = await ctx.params;
    await prisma.$transaction([
      prisma.transaction.updateMany({
        where: { bookingId: id },
        data: { bookingId: null },
      }),
      prisma.booking.delete({ where: { id } }),
    ]);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus jadwal booking" }, { status: 400 });
  }
}
