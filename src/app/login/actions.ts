"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!loginId || !password) return { error: "아이디와 비밀번호를 입력하세요." };
  const user = await login(loginId, password);
  if (!user) return { error: "아이디 또는 비밀번호가 맞지 않습니다. 등록된 계정만 사용할 수 있습니다." };
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
