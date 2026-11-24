import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storeSettingUpdateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const setting = await prisma.storeSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    return NextResponse.json({ data: setting });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Gagal memuat pengaturan" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = storeSettingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data pengaturan tidak valid" },
        { status: 400 }
      );
    }

    const updated = await prisma.storeSetting.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: {
        id: "default",
        ...parsed.data,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 400 });
  }
}
