import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canEdit, getSessionUser } from "@/lib/auth";
import { getItemDetail, getSettings, getSites } from "@/lib/stock";
import { ADJUSTMENT_TYPE_LABEL, ADJUSTMENT_TYPES } from "@/lib/domain/availableQty";
import { fmtDate, fmtDateTime, fmtNum } from "@/lib/format";
import { releaseAdjustment } from "./actions";
import { AdjustmentForm, ConsultNoteForm } from "./forms";

export default function ItemPage(props: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-gray-500">불러오는 중…</p>}>
      <ItemDetail params={props.params} />
    </Suspense>
  );
}

async function ItemDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [user, settings, sites] = await Promise.all([getSessionUser(), getSettings(), getSites()]);
  if (!user) redirect("/login"); // FR-01
  const d = await getItemDetail(decodeURIComponent(code), null);
  if (!d) notFound();
  const editor = canEdit(user);
  const customers = (await prisma.customer.findMany({ orderBy: { name: "asc" }, select: { name: true } })).map((c) => c.name);
  const released = d.item.adjustments.filter((a) => a.status === "RELEASED");

  return (
    <div className="space-y-4 py-3">
      <Link href="/" className="text-sm text-blue-600">
        ← 목록으로
      </Link>

      {/* FR-04 출고 가능 수량 */}
      <section className="rounded-lg border bg-white p-4">
        <p className="text-xs text-gray-500">{d.item.code}</p>
        <h1 className="text-lg font-bold">{d.item.name}</h1>
        <p className="mt-3 text-sm text-gray-600">출고 가능 수량</p>
        <p className={`text-4xl font-bold tabular-nums ${d.calc.available === 0 ? "text-gray-400" : ""}`}>
          {fmtNum(d.calc.available)} <span className="text-base font-normal text-gray-500">{d.item.unit}</span>
        </p>
        {d.calc.isNegative && <p className="mt-1 text-sm text-red-600">⚠ {d.calc.warning}</p>}
        <dl className="mt-3 divide-y rounded border text-sm">
          <Row label="ERP 재고" value={fmtNum(d.erpQty)} />
          {settings.siteFilterEnabled &&
            d.stocks.map((s) => <Row key={s.siteCode} label={`　${s.site.name}`} value={fmtNum(s.erpQty)} muted />)}
          {ADJUSTMENT_TYPES.filter((t) => d.calc.byType[t] > 0).map((t) => (
            <Row key={t} label={`− ${ADJUSTMENT_TYPE_LABEL[t]}`} value={fmtNum(d.calc.byType[t])} warn />
          ))}
          {d.item.packQty && (
            <Row label="포장 단위" value={`${d.item.packUnit ?? "묶음"} ${fmtNum(d.item.packQty)}${d.item.unit}`} muted />
          )}
        </dl>
      </section>

      {/* FR-07/08 적용 중인 변동 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">적용 중인 변동 ({d.active.length})</h2>
        {d.active.length === 0 && <p className="text-sm text-gray-500">없음</p>}
        {d.active.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-2 rounded-lg border bg-white p-3 text-sm">
            <div>
              <p>
                <b>
                  {ADJUSTMENT_TYPE_LABEL[a.type]} {fmtNum(a.qty)}
                </b>{" "}
                <span className="text-gray-500">· {a.site.name}</span>
              </p>
              <p className="text-gray-600">{a.reason}</p>
              <p className="text-xs text-gray-400">
                {a.createdBy.name} · {fmtDateTime(a.createdAt)}
              </p>
            </div>
            {editor && (
              <form action={releaseAdjustment}>
                <input type="hidden" name="id" value={a.id} />
                <button className="rounded border px-2 py-1 text-xs">해제</button>
              </form>
            )}
          </div>
        ))}
        {editor && <AdjustmentForm itemCode={d.item.code} sites={sites} />}
        {released.length > 0 && (
          <details className="text-xs text-gray-500">
            <summary>해제된 변동 {released.length}건 (기록 보존)</summary>
            <ul className="mt-1 space-y-1">
              {released.map((a) => (
                <li key={a.id}>
                  {ADJUSTMENT_TYPE_LABEL[a.type]} {fmtNum(a.qty)} · {a.reason} → 해제 {fmtDateTime(a.releasedAt)}{" "}
                  {a.releasedBy?.name && `(${a.releasedBy.name})`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* FR-14/15 생산 예정 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">생산 예정</h2>
        {d.item.plans.length === 0 && <p className="text-sm text-gray-500">등록된 생산 계획이 없습니다.</p>}
        {d.item.plans.map((p) => (
          <div key={p.id} className="rounded-lg border bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <b>{fmtNum(p.plannedQty)}개</b>
              <span className={`rounded px-2 py-0.5 text-xs ${p.stage.isFinal ? "bg-gray-200" : "bg-blue-100 text-blue-800"}`}>
                {p.stage.name}
              </span>
            </div>
            <p className="text-gray-600">완료 예정 {fmtDate(p.dueDate)} · {p.site.name}</p>
            <p className="text-xs text-gray-400">
              단계 변경 {fmtDateTime(p.stageChangedAt)} · {p.updatedBy.name}
            </p>
            {p.memo && <p className="text-xs text-gray-500">{p.memo}</p>}
          </div>
        ))}
      </section>

      {/* FR-17 상담 메모 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">상담 메모</h2>
        <ConsultNoteForm itemCode={d.item.code} customers={customers} />
        {d.item.consultNotes.map((n) => (
          <div key={n.id} className="rounded-lg border bg-white p-3 text-sm">
            <p>
              <b>{n.customerName}</b> · {fmtNum(n.requestedQty)}개 · 희망 납기 {fmtDate(n.desiredDate)}
            </p>
            {n.content && <p className="text-gray-600">{n.content}</p>}
            <p className="text-xs text-gray-400">
              {n.author.name} · {fmtDateTime(n.createdAt)} · {n.status === "OPEN" ? "상담 중" : n.status === "CONVERTED" ? "수주 전환" : "종료"}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Row({ label, value, warn, muted }: { label: string; value: string; warn?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between px-3 py-2 ${warn ? "text-orange-700" : muted ? "text-gray-500" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums font-medium">{value}</dd>
    </div>
  );
}
