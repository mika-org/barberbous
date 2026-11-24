import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingCreateSchema } from "@/lib/validators";

export async function GET() {
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
