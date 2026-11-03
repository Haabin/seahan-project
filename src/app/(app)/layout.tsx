import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, ROLE_LABEL } from "@/lib/auth";
import { getSettings, getSyncStatus } from "@/lib/stock";
import { fmtAge, fmtDateTime } from "@/lib/format";
import { logoutAction } from "@/app/login/actions";
import { BottomNav, type NavItem } from "./bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Suspense fallback={<div className="h-[5.5rem] border-b bg-white" />}>
        <Header />
      </Suspense>
      {/* 하단 탭바 높이만큼 여백 */}
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-20">{children}</div>
      <Suspense fallback={null}>
        <Nav />
      </Suspense>
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
      {/* 1줄: 제목 · 사용자 · 로그아웃 (320px에서도 한 줄) */}
      <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-2">
        <Link href="/" className="whitespace-nowrap text-base font-bold">
          출고·재고 보드
        </Link>
        <span className="ml-auto min-w-0 truncate text-xs text-gray-500">
          {user.name}
          <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-600">{ROLE_LABEL[user.role]}</span>
        </span>
        <form action={logoutAction}>
          <button type="submit" aria-label="로그아웃" title="로그아웃" className="rounded border px-2 py-1 text-xs whitespace-nowrap">
            나가기
          </button>
        </form>
      </div>

      {/* 2줄: 데이터 기준 시각 (FR-05). 오래되면 아래 줄에 경고 */}
      <div className={`${sync.isStale ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`}>
        <div className="mx-auto w-full max-w-md px-4 py-1 text-xs">
          <p className="whitespace-nowrap">
            기준 시각 <b>{fmtDateTime(sync.lastSyncAt)}</b> · {fmtAge(sync.ageMinutes)}
          </p>
          {sync.isStale && <p className="font-bold">⚠ 데이터가 오래됨. 숫자를 그대로 믿지 마세요</p>}
        </div>
      </div>
      {settings.seedDataNotice && (
        <div className="mx-auto w-full max-w-md bg-amber-50 px-4 py-1 text-[11px] text-amber-800">
          시연용 참고 데이터입니다. 재고 수량은 임의 값이며 ERP 연동 후 실제 값으로 바뀝니다.
        </div>
      )}
    </header>
  );
}

async function Nav() {
  const user = await getSessionUser();
  if (!user) return null;
  const items: NavItem[] = [
    { href: "/", label: "재고" },
    { href: "/notes", label: "내 메모" },
    { href: "/history", label: "이력" },
  ];
  if (user.role === "EDITOR" || user.role === "ADMIN") items.push({ href: "/plans", label: "생산 계획" });
  if (user.role === "ADMIN") items.push({ href: "/admin/users", label: "사용자" });
  return <BottomNav items={items} />;
}
