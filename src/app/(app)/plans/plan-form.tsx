"use client";

import { useActionState } from "react";
import { addPlan } from "./actions";

const input = "w-full min-w-0 rounded-lg border px-3 py-2.5 text-base";

export function PlanForm({
  sites,
  stages,
  items,
}: {
  sites: { code: string; name: string }[];
  stages: { code: string; name: string }[];
  items: { code: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(addPlan, undefined);
  return (
    <form action={action} className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <p className="text-sm font-semibold">새 생산 계획</p>
      <input name="itemCode" list="items" placeholder="품번 (예: FM00009)" required className={input} />
      <datalist id="items">
        {items.map((i) => (
          <option key={i.code} value={i.code}>
            {i.name}
          </option>
        ))}
      </datalist>
      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <select name="siteCode" className={input} defaultValue={sites[0]?.code}>
          {sites.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <input name="plannedQty" type="number" min={1} inputMode="numeric" placeholder="계획 수량" required className={input} />
      </div>
      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <label className="text-xs text-gray-600">
          착수 예정일
          <input name="startDate" type="date" className={input} />
        </label>
        <label className="text-xs text-gray-600">
          완료 예정일
          <input name="dueDate" type="date" required className={input} />
        </label>
      </div>
      <select name="stageCode" className={input} defaultValue="PLANNED">
        {stages.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
      <input name="memo" placeholder="메모 (지연 사유 등)" className={input} />
      {state && !state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">등록됐습니다. 영업사원 화면에 바로 반영됩니다.</p>}
      <button disabled={pending} className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "저장 중…" : "계획 등록"}
      </button>
    </form>
  );
}
