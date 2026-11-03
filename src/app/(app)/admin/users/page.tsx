import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, ROLE_LABEL } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { changeRole, toggleActive } from "./actions";
import { UserForm } from "./user-form";

export default function UsersPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-gray-500">불러오는 중…</p>}>
      <Users />
    </Suspense>
  );
}

/** FR-13 사용자 관리: 계정 생성, 권한 변경, 즉시 차단 */
async function Users() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (me.role !== "ADMIN") redirect("/");
  const users = await prisma.user.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] });
  return (
    <div className="space-y-4 py-3">
      <h1 className="text-lg font-bold">사용자 관리</h1>
      <UserForm />
      <ul className="divide-y rounded-lg border bg-white text-sm">
        {users.map((u) => (
          <li key={u.id} className={`flex items-center justify-between gap-2 px-3 py-2 ${u.isActive ? "" : "bg-gray-100 text-gray-400"}`}>
            <div className="min-w-0">
              <p className="font-medium">
                {u.name} <span className="text-xs text-gray-500">({u.loginId})</span>
                {!u.isActive && <span className="ml-1 rounded bg-red-100 px-1 text-xs text-red-700">차단됨</span>}
              </p>
              <p className="text-xs text-gray-400">등록 {fmtDateTime(u.createdAt)}</p>
            </div>
            {u.id === me.id ? (
              <span className="text-xs text-gray-500">{ROLE_LABEL[u.role]} (나)</span>
            ) : (
              <div className="flex shrink-0 items-center gap-1">
                <form action={changeRole} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className="rounded border px-1 py-1 text-xs">
                    <option value="VIEWER">영업팀</option>
                    <option value="EDITOR">생산지원팀</option>
                    <option value="ADMIN">관리자</option>
                  </select>
                  <button className="rounded border px-2 py-1 text-xs">변경</button>
                </form>
                <form action={toggleActive}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className={`rounded px-2 py-1 text-xs text-white ${u.isActive ? "bg-red-600" : "bg-green-600"}`}>
                    {u.isActive ? "차단" : "해제"}
                  </button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
