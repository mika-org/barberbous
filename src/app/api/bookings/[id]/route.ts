import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingUpdateSchema } from "@/lib/validators";

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
    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus booking" }, { status: 400 });
  }
}
