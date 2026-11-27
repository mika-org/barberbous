import { NextResponse } from "next/server";
import { getCurrentUser } from "./session";
import { verifyPassword, type SessionUser } from "./auth";
import { prisma } from "./prisma";

export function isManagerRole(role?: string | null): boolean {
  return role === "Owner" || role === "Admin";
}

export async function requireManager(): Promise<
  { ok: true; user: SessionUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sesi login berakhir" }, { status: 401 }),
    };
  }
  if (!isManagerRole(user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Akses dibatasi: hanya Owner atau Admin yang dapat melakukan tindakan ini." },
        { status: 403 }
      ),
    };
  }
  return { ok: true, user };
}

export async function verifyManagerOverridePassword(password?: string | null): Promise<boolean> {
  if (!password || !password.trim()) return false;
  const managers = await prisma.staffUser.findMany({
    where: {
      isActive: true,
      role: { in: ["Owner", "Admin"] },
    },
    select: { passwordHash: true },
  });
  return managers.some((m) => verifyPassword(password, m.passwordHash));
}
