import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ADJUSTMENT_TYPE_LABEL } from "@/lib/domain/availableQty";
import { fmtDateTime, fmtNum } from "@/lib/format";

type Search = { q?: string };
const DAYS = 90;

export default function HistoryPage(props: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-gray-500">불러오는 중…</p>}>
      <History searchParams={props.searchParams} />
    </Suspense>
  );
}

/** FR-12 변동 이력: 최근 90일, 품목으로 거르기 */
async function History({ searchParams }: { searchParams: Promise<Search> }) {
  if (!(await getSessionUser())) redirect("/login");
  const { q } = await searchParams;
  const since = new Date(Date.now() - DAYS * 86_400_000);
  const rows = await prisma.adjustment.findMany({
    where: {
      createdAt: { gte: since },
      ...(q ? { OR: [{ itemCode: { contains: q.toUpperCase() } }, { item: { name: { contains: q } } }] } : {}),
    },
    include: { item: true, site: true, createdBy: { select: { name: true } }, releasedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-3 py-3">
      <h1 className="text-lg font-bold">변동 이력 (최근 {DAYS}일)</h1>
      <form className="flex gap-2" action="/history">
        <input name="q" defaultValue={q ?? ""} placeholder="품번 또는 품명" className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-base" />
        <button className="rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white">찾기</button>
      </form>
      <p className="text-xs text-gray-500">{rows.length}건</p>
      <ul className="divide-y rounded-lg border bg-white text-sm">
        {rows.length === 0 && <li className="p-6 text-center text-gray-500">기록이 없습니다.</li>}
        {rows.map((a) => (
          <li key={a.id} className={`px-3 py-2 ${a.status === "RELEASED" ? "text-gray-500" : ""}`}>
            <div className="flex items-center justify-between">
              <Link href={`/items/${encodeURIComponent(a.itemCode)}`} className="truncate font-medium underline">
                {a.item.name}
              </Link>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${a.status === "ACTIVE" ? "bg-orange-100 text-orange-800" : "bg-gray-100"}`}>
                {a.status === "ACTIVE" ? "적용 중" : "해제됨"}
              </span>
            </div>
            <p>
              {ADJUSTMENT_TYPE_LABEL[a.type]} <b>{fmtNum(a.qty)}</b> · {a.site.name} · {a.reason}
            </p>
            <p className="text-xs text-gray-400">
              입력 {a.createdBy.name} {fmtDateTime(a.createdAt)}
              {a.releasedAt && ` · 해제 ${a.releasedBy?.name ?? ""} ${fmtDateTime(a.releasedAt)}${a.releaseNote ? ` (${a.releaseNote})` : ""}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
