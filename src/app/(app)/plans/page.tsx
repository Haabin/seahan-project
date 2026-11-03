import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canEdit, getSessionUser } from "@/lib/auth";
import { getSites } from "@/lib/stock";
import { fmtDate, fmtDateTime, fmtNum } from "@/lib/format";
import { changeStage } from "./actions";
import { PlanForm } from "./plan-form";

type Search = { tab?: string };

export default function PlansPage(props: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-gray-500">불러오는 중…</p>}>
      <Plans searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Plans({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canEdit(user)) redirect("/"); // 생산지원팀·관리자 전용
  const { tab } = await searchParams;
  const showRequests = tab === "requests";

  const [sites, stages, items] = await Promise.all([
    getSites(),
    prisma.processStage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.item.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { code: true, name: true } }),
  ]);

  return (
    <div className="space-y-4 py-3">
      <div className="flex gap-2 text-sm">
        <Tab href="/plans" active={!showRequests}>
          생산 계획
        </Tab>
        <Tab href="/plans?tab=requests" active={showRequests}>
          고객 요청
        </Tab>
      </div>
      {showRequests ? <CustomerRequests /> : <PlanList sites={sites} stages={stages} items={items} />}
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-full px-4 py-1.5 ${active ? "bg-gray-900 text-white" : "border text-gray-600"}`}>
      {children}
    </Link>
  );
}

/** FR-16 생산 계획 목록 + 단계 변경 + 신규 등록 */
async function PlanList({
  sites,
  stages,
  items,
}: {
  sites: { code: string; name: string }[];
  stages: { code: string; name: string; isFinal: boolean }[];
  items: { code: string; name: string }[];
}) {
  const plans = await prisma.productionPlan.findMany({
    include: { item: true, site: true, stage: true, updatedBy: { select: { name: true } } },
    orderBy: [{ stage: { sortOrder: "asc" } }, { dueDate: "asc" }],
  });
  return (
    <>
      <PlanForm sites={sites} stages={stages} items={items} />
      <ul className="space-y-2">
        {plans.map((p) => (
          <li key={p.id} className="rounded-lg border bg-white p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.item.name}</p>
                <p className="text-xs text-gray-500">
                  {p.item.code} · {p.site.name} · <b>{fmtNum(p.plannedQty)}개</b> · 완료 예정 {fmtDate(p.dueDate)}
                </p>
                <p className="text-xs text-gray-400">
                  단계 변경 {fmtDateTime(p.stageChangedAt)} · {p.updatedBy.name}
                  {p.memo && ` · ${p.memo}`}
                </p>
              </div>
              <form action={changeStage} className="shrink-0">
                <input type="hidden" name="id" value={p.id} />
                <select
                  name="stageCode"
                  defaultValue={p.stageCode}
                  className={`rounded border px-2 py-1 text-xs ${p.stage.isFinal ? "bg-gray-100" : "bg-blue-50"}`}
                >
                  {stages.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button className="ml-1 rounded border px-2 py-1 text-xs">변경</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** FR-18 고객 요청 모아보기: 품목·희망 납기 순, 납기가 완료 예정일보다 빠르면 강조 */
async function CustomerRequests() {
  const notes = await prisma.consultNote.findMany({
    where: { deletedAt: null, status: "OPEN" },
    include: { item: { include: { plans: { where: { stage: { isFinal: false } }, orderBy: { dueDate: "asc" }, take: 1 } } }, author: { select: { name: true } } },
    orderBy: [{ itemCode: "asc" }, { desiredDate: "asc" }],
  });
  return (
    <ul className="space-y-2">
      {notes.length === 0 && <p className="text-sm text-gray-500">상담 중인 고객 요청이 없습니다.</p>}
      {notes.map((n) => {
        const plan = n.item.plans[0];
        const urgent = plan ? n.desiredDate < plan.dueDate : false;
        const noPlan = !plan;
        return (
          <li key={n.id} className={`rounded-lg border p-3 text-sm ${urgent ? "border-red-300 bg-red-50" : "bg-white"}`}>
            <p className="font-medium">
              <Link href={`/items/${encodeURIComponent(n.itemCode)}`} className="underline">
                {n.item.name}
              </Link>
            </p>
            <p>
              <b>{n.customerName}</b> · {fmtNum(n.requestedQty)}개 · 희망 납기 <b>{fmtDate(n.desiredDate)}</b>
            </p>
            <p className={`text-xs ${urgent ? "text-red-700 font-semibold" : "text-gray-500"}`}>
              {plan
                ? `생산 완료 예정 ${fmtDate(plan.dueDate)}${urgent ? " — 희망 납기가 더 빠름, 계획 조정 검토" : ""}`
                : noPlan
                  ? "등록된 생산 계획 없음"
                  : ""}
            </p>
            {n.content && <p className="text-xs text-gray-600">{n.content}</p>}
            <p className="text-xs text-gray-400">
              {n.author.name} · {fmtDateTime(n.createdAt)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
