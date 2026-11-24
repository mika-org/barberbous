import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    const username = parsed.data.username.toLowerCase();
    const user = await prisma.staffUser.findUnique({
      where: { username },
    });

    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Akun ini sedang dinonaktifkan. Hubungi Owner/Admin." },
        { status: 403 }
      );
    }

    const { token, expiresAt } = await signSessionToken({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    });

    const isHttps =
      req.nextUrl.protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https";

    const response = NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Gagal memproses login" }, { status: 500 });
  }
}
