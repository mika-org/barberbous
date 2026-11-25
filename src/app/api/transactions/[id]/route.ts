import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transactionUpdateSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/transactions/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = transactionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data transaksi tidak valid" },
        { status: 400 }
      );
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    const nextMethod = parsed.data.paymentMethod ?? existing.paymentMethod;
    const nextStatus = parsed.data.status ?? existing.status;

    let cashReceived = existing.cashReceived;
    let changeAmount = existing.changeAmount;

    if (nextMethod === "TUNAI") {
      cashReceived = parsed.data.cashReceived ?? existing.cashReceived ?? existing.total;
      if (cashReceived < existing.total && nextStatus === "SELESAI") {
        return NextResponse.json({ error: "Nominal tunai kurang dari total" }, { status: 400 });
      }
      changeAmount = Math.max(0, cashReceived - existing.total);
    } else {
      cashReceived = null;
      changeAmount = null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTx = await tx.transaction.update({
        where: { id },
        data: {
          status: nextStatus,
          paymentMethod: nextMethod,
          cashReceived,
          changeAmount,
        },
        include: { items: true },
      });

      if (existing.bookingId && nextStatus === "SELESAI") {
        await tx.booking.update({
          where: { id: existing.bookingId },
          data: { status: "SELESAI" },
        });
      }

      return updatedTx;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/transactions/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui transaksi" }, { status: 400 });
  }
}
