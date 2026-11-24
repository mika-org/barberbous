import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionUser } from "@/lib/auth";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const staff = await prisma.staffUser.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, username: true, role: true, isActive: true },
  });

  if (!staff || !staff.isActive) return null;

  return {
    id: staff.id,
    name: staff.name,
    username: staff.username,
    role: staff.role,
    exp: payload.exp,
  };
}
