"use client";

import { useActionState } from "react";
import { addAdjustment, addConsultNote } from "./actions";
import { ADJUSTMENT_TYPE_LABEL, ADJUSTMENT_TYPES } from "@/lib/domain/availableQty";

const input = "w-full min-w-0 rounded-lg border px-3 py-2.5 text-base";

export function AdjustmentForm({ itemCode, sites }: { itemCode: string; sites: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addAdjustment, undefined);
  return (
    <form action={action} className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
      <p className="text-sm font-semibold">변동 입력 (불량·보류 등)</p>
      <input type="hidden" name="itemCode" value={itemCode} />
      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <select name="siteCode" className={input} defaultValue={sites[0]?.code}>
          {sites.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="type" className={input} defaultValue="DEFECT">
          {ADJUSTMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {ADJUSTMENT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      <input name="qty" type="number" min={1} step={1} inputMode="numeric" placeholder="수량" required className={input} />
      <input name="reason" placeholder="사유 (예: 출고 전 검사 불량)" required className={input} />
      {state && !state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">저장됐습니다. 출고 가능 수량에 바로 반영됩니다.</p>}
      <button disabled={pending} className="w-full rounded-lg bg-orange-600 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}

export function ConsultNoteForm({ itemCode, customers }: { itemCode: string; customers: string[] }) {
  const [state, action, pending] = useActionState(addConsultNote, undefined);
  return (
    <form action={action} className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <p className="text-sm font-semibold">상담 메모 쓰기</p>
      <input type="hidden" name="itemCode" value={itemCode} />
      <input name="customerName" list="customers" placeholder="고객명(거래처)" required className={input} />
      <datalist id="customers">
        {customers.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <input name="requestedQty" type="number" min={1} inputMode="numeric" placeholder="요청 수량" required className={input} />
        <input name="desiredDate" type="date" required className={input} />
      </div>
      <textarea name="content" rows={2} placeholder="상담 내용" className={input} />
      {state && !state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-green-700">
          메모가 저장됐습니다.{" "}
          <a href="/notes" className="underline">
            내 메모 보기
          </a>
        </p>
      )}
      <button disabled={pending} className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "저장 중…" : "메모 저장"}
      </button>
    </form>
  );
}
