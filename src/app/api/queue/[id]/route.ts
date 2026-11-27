import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/queue/[id]">) {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.activeService.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data layanan aktif tidak ditemukan" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.activeService.update({
        where: { id },
        data: { status: "BATAL", completedAt: new Date() },
      });

      const remaining = await tx.activeService.count({
        where: { capsterId: existing.capsterId, status: "MELAYANI" },
      });
      if (remaining === 0) {
        await tx.capster.update({
          where: { id: existing.capsterId },
          data: { status: "TERSEDIA" },
        });
      }
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/queue/[id] error:", error);
    return NextResponse.json({ error: "Gagal membatalkan antrian layanan" }, { status: 400 });
  }
}
