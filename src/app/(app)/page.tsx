import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSettings, getSites, getStockList } from "@/lib/stock";
import { toggleFavorite } from "./actions";
import { fmtNum } from "@/lib/format";

type Search = { q?: string; site?: string };

export default function StockListPage(props: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-gray-500">불러오는 중…</p>}>
      <StockList searchParams={props.searchParams} />
    </Suspense>
  );
}

async function StockList({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login"); // FR-01: 미등록·만료 세션 차단
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const settings = await getSettings();
  const sites = settings.siteFilterEnabled ? await getSites() : [];
  const site = settings.siteFilterEnabled && sp.site ? sp.site : null;
  const rows = await getStockList(q, site, user.id);

  return (
    <div>
      {/* FR-03 검색, FR-06 사업장 필터 */}
      <form className="sticky top-[4.6rem] z-[5] -mx-4 flex gap-2 bg-white px-4 py-3" action="/">
        <input
          name="q"
          defaultValue={q}
          placeholder="품명이나 규격 일부를 입력"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border px-3 py-3 text-base"
        />
        {settings.siteFilterEnabled && (
          <select name="site" defaultValue={site ?? ""} className="rounded-lg border px-2 text-sm">
            <option value="">전체</option>
            {sites.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white">
          검색
        </button>
      </form>

      <p className="mb-2 text-xs text-gray-500">
        {q ? `"${q}" 검색 결과 ${rows.length}건` : `전체 ${rows.length}개 품목`} · 오른쪽 숫자가 <b>출고 가능 수량</b>
      </p>

      {/* FR-02 목록 */}
      <ul className="divide-y rounded-lg border bg-white">
        {rows.length === 0 && <li className="p-6 text-center text-sm text-gray-500">찾는 품목이 없습니다.</li>}
        {rows.map((r) => (
          <li key={r.code} className="flex items-stretch">
            {/* FR-11 즐겨찾기 */}
            <form action={toggleFavorite} className="flex items-center pl-2">
              <input type="hidden" name="itemCode" value={r.code} />
              <button
                aria-label={r.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                className={`px-1 text-xl ${r.isFavorite ? "text-yellow-500" : "text-gray-300"}`}
              >
                ★
              </button>
            </form>
            <Link href={`/items/${encodeURIComponent(r.code)}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-4 pl-1 active:bg-gray-50">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-gray-500">
                  {r.code} · ERP {fmtNum(r.erpQty)}
                  {r.calc.deductedTotal > 0 && <span className="text-orange-600"> − 차감 {fmtNum(r.calc.deductedTotal)}</span>}
                  {r.plannedQty > 0 && <span className="text-blue-600"> · 추가 생산 예정 {fmtNum(r.plannedQty)}</span>}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold tabular-nums ${r.calc.available === 0 ? "text-gray-400" : ""}`}>
                  {fmtNum(r.calc.available)}
                  <span className="ml-0.5 text-xs font-normal text-gray-500">{r.unit}</span>
                </p>
                {r.calc.isNegative && <p className="text-[11px] text-red-600">⚠ 차감이 재고보다 큼</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
