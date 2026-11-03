import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canEdit, getSessionUser } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtNum } from "@/lib/format";
import { changeNoteStatus, deleteNote } from "./actions";

type Search = { status?: string; all?: string };

const STATUS_LABEL: Record<string, string> = { OPEN: "상담 중", CONVERTED: "수주 전환", CLOSED: "종료" };
const TABS = [
  { key: "OPEN", label: "상담 중" },
  { key: "CONVERTED", label: "수주 전환" },
  { key: "CLOSED", label: "종료" },
  { key: "ALL", label: "전체" },
];

export default function NotesPage(props: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-gray-500">불러오는 중…</p>}>
      <Notes searchParams={props.searchParams} />
    </Suspense>
  );
}

/** 내 상담 메모 (정의서 6.4): 상태별로 보고 상태를 바꾼다. FR-17, NFR-09 */
async function Notes({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.status) ? sp.status! : "OPEN";
  const showAll = canEdit(user) && sp.all === "1";

  const notes = await prisma.consultNote.findMany({
    where: {
      deletedAt: null,
      ...(showAll ? {} : { authorId: user.id }),
      ...(tab === "ALL" ? {} : { status: tab as "OPEN" | "CONVERTED" | "CLOSED" }),
    },
    include: { item: { select: { name: true } }, author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const href = (status: string, all = showAll) => `/notes?status=${status}${all ? "&all=1" : ""}`;

  return (
    <div className="space-y-3 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{showAll ? "모든 상담 메모" : "내 메모"}</h1>
        {canEdit(user) && (
          <Link href={href(tab, !showAll)} className="text-xs text-blue-600 underline">
            {showAll ? "내 것만" : "전체 보기"}
          </Link>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key)}
            className={`shrink-0 rounded-full px-3 py-1 ${tab === t.key ? "bg-gray-900 text-white" : "border text-gray-600"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <ul className="space-y-2">
        {notes.length === 0 && (
          <li className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
            메모가 없습니다. 품목 상세에서 &quot;상담 메모 쓰기&quot;로 남길 수 있습니다.
          </li>
        )}
        {notes.map((n) => {
          const mine = n.authorId === user.id || user.role === "ADMIN";
          return (
            <li key={n.id} className="rounded-lg border bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/items/${encodeURIComponent(n.itemCode)}`} className="min-w-0 truncate font-medium underline">
                  {n.item.name}
                </Link>
                <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs">{STATUS_LABEL[n.status]}</span>
              </div>
              <p className="mt-1">
                <b>{n.customerName}</b> · {fmtNum(n.requestedQty)}개 · 희망 납기 {fmtDate(n.desiredDate)}
              </p>
              {n.content && <p className="text-gray-600">{n.content}</p>}
              <p className="text-xs text-gray-400">
                {n.author.name} · {fmtDateTime(n.createdAt)}
              </p>
              {mine && (
                <div className="mt-2 flex items-center gap-1">
                  <form action={changeNoteStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={n.id} />
                    <select name="status" defaultValue={n.status} className="rounded border px-2 py-1 text-xs">
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button className="rounded border px-2 py-1 text-xs">상태 변경</button>
                  </form>
                  <form action={deleteNote} className="ml-auto">
                    <input type="hidden" name="id" value={n.id} />
                    <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">삭제</button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
