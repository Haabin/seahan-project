import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, ROLE_LABEL } from "@/lib/auth";
import { getSettings, getSyncStatus } from "@/lib/stock";
import { fmtAge, fmtDateTime } from "@/lib/format";
import { logoutAction } from "@/app/login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Suspense fallback={<div className="h-14 border-b bg-white" />}>
        <Header />
      </Suspense>
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-10">{children}</div>
    </div>
  );
}

async function Header() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const settings = await getSettings();
  const sync = await getSyncStatus(settings.syncIntervalMin);
  return (
    <header className="sticky top-0 z-10 border-b bg-white">
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
        <nav className="flex items-center gap-3">
          <Link href="/" className="text-base font-bold">
            출고·재고 보드
          </Link>
          {(user.role === "EDITOR" || user.role === "ADMIN") && (
            <Link href="/plans" className="text-xs text-blue-600 underline">
              생산 계획
            </Link>
          )}
          {user.role === "ADMIN" && (
            <Link href="/admin/users" className="text-xs text-blue-600 underline">
              사용자
            </Link>
          )}
        </nav>
        <form action={logoutAction} className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {user.name} · {ROLE_LABEL[user.role]}
          </span>
          <button type="submit" className="rounded border px-2 py-1">
            로그아웃
          </button>
        </form>
      </div>
      {/* FR-05: 데이터 기준 시각 + 오래됨 경고 */}
      <div
        className={`mx-auto flex w-full max-w-md items-center justify-between px-4 py-1.5 text-xs ${
          sync.isStale ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
        }`}
      >
        <span>
          기준 시각 <b>{fmtDateTime(sync.lastSyncAt)}</b> ({fmtAge(sync.ageMinutes)})
        </span>
        {sync.isStale && <b>⚠ 데이터가 오래됨 — 숫자를 그대로 믿지 마세요</b>}
      </div>
      {settings.seedDataNotice && (
        <div className="mx-auto w-full max-w-md bg-amber-50 px-4 py-1 text-[11px] text-amber-800">
          시연용 참고 데이터입니다. 재고 수량은 임의 값이며 ERP 연동 후 실제 값으로 바뀝니다.
        </div>
      )}
    </header>
  );
}
