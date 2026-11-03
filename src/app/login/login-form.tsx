"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-sm font-medium">아이디</span>
        <input
          name="loginId"
          autoComplete="username"
          autoCapitalize="none"
          required
          className="mt-1 w-full rounded-lg border px-3 py-3 text-base"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">비밀번호</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border px-3 py-3 text-base"
        />
      </label>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
