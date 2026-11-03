"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

/** FR-13 계정 생성 (관리자) */
export async function createUser(_prev: Result | undefined, formData: FormData): Promise<Result> {
  const me = await getSessionUser();
  if (me?.role !== "ADMIN") return { ok: false, error: "관리자만 계정을 만들 수 있습니다." };
  const loginId = String(formData.get("loginId") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "VIEWER");
  if (!/^[a-z0-9._-]{3,30}$/.test(loginId)) return { ok: false, error: "아이디는 영문 소문자·숫자 3~30자입니다." };
  if (!name) return { ok: false, error: "이름을 입력하세요." };
  if (password.length < 6) return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  if (!["VIEWER", "EDITOR", "ADMIN"].includes(role)) return { ok: false, error: "권한이 잘못됐습니다." };
  if (await prisma.user.findUnique({ where: { loginId } })) return { ok: false, error: "이미 있는 아이디입니다." };
  await prisma.user.create({
    data: { loginId, name, role: role as "VIEWER" | "EDITOR" | "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** FR-13 즉시 차단/해제: 차단 시 세션도 모두 지워 바로 로그아웃된다 */
export async function toggleActive(formData: FormData): Promise<void> {
  const me = await getSessionUser();
  if (me?.role !== "ADMIN") return;
  const id = String(formData.get("id") ?? "");
  if (id === me.id) return; // 자기 자신은 차단 불가
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
  if (u.isActive) await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/admin/users");
}

/** FR-13 권한 변경 */
export async function changeRole(formData: FormData): Promise<void> {
  const me = await getSessionUser();
  if (me?.role !== "ADMIN") return;
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (id === me.id || !["VIEWER", "EDITOR", "ADMIN"].includes(role)) return;
  await prisma.user.update({ where: { id }, data: { role: role as "VIEWER" | "EDITOR" | "ADMIN" } });
  revalidatePath("/admin/users");
}
