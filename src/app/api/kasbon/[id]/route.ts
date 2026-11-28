import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.kasbon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Kasbon tidak ditemukan" }, { status: 404 });
    }

    await prisma.kasbon.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Kasbon berhasil dihapus" });
  } catch (error) {
    console.error("DELETE /api/kasbon/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus kasbon" }, { status: 500 });
  }
}
