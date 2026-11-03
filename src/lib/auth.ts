import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role } from "../../prisma/generated/enums";

export const SESSION_COOKIE = "sid";
const SESSION_DAYS = 7;

export interface SessionUser {
  id: string;
  loginId: string;
  name: string;
  role: Role;
}

/** 아이디/비밀번호 확인 후 세션을 만들고 쿠키를 심는다 (FR-01). 실패 시 null */
export async function login(loginId: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !user.isActive) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  const id = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({ data: { id, userId: user.id, expiresAt } });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return { id: user.id, loginId: user.loginId, name: user.name, role: user.role };
}

export async function logout() {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (sid) await prisma.session.deleteMany({ where: { id: sid } });
  jar.delete(SESSION_COOKIE);
}

/** 현재 로그인 사용자. 세션 만료·계정 차단(FR-13)이면 null */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const session = await prisma.session.findUnique({ where: { id: sid }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const u = session.user;
  return { id: u.id, loginId: u.loginId, name: u.name, role: u.role };
}

export function canEdit(user: SessionUser | null): boolean {
  return user?.role === "EDITOR" || user?.role === "ADMIN";
}

export const ROLE_LABEL: Record<Role, string> = { VIEWER: "영업팀", EDITOR: "생산지원팀", ADMIN: "관리자" };
