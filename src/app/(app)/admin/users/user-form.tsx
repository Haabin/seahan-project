"use client";

import { useActionState } from "react";
import { createUser } from "./actions";

const input = "w-full rounded-lg border px-3 py-2.5 text-base";

export function UserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  return (
    <form action={action} className="space-y-2 rounded-lg border bg-gray-50 p-3">
      <p className="text-sm font-semibold">계정 만들기</p>
      <div className="grid grid-cols-2 gap-2">
        <input name="loginId" placeholder="아이디" autoCapitalize="none" required className={input} />
        <input name="name" placeholder="이름" required className={input} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="password" type="password" placeholder="초기 비밀번호" required className={input} />
        <select name="role" className={input} defaultValue="VIEWER">
          <option value="VIEWER">영업팀 (조회)</option>
          <option value="EDITOR">생산지원팀 (입력)</option>
          <option value="ADMIN">관리자</option>
        </select>
      </div>
      {state && !state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">계정이 만들어졌습니다.</p>}
      <button disabled={pending} className="w-full rounded-lg bg-gray-900 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "저장 중…" : "만들기"}
      </button>
    </form>
  );
}
