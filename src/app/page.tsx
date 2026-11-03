// 1단계 임시 홈: DB 연결과 시드 결과를 눈으로 확인한다. 2단계에서 재고 조회 화면으로 교체.
// Next.js 16 Cache Components: DB를 읽는 부분은 <Suspense> 안에서 요청 시점에 렌더링한다.
import { Suspense } from "react";

async function loadSummary() {
  if (!process.env.DATABASE_URL) {
    return { ok: false as const, reason: ".env 에 DATABASE_URL 이 없습니다. .env.example 을 참고하세요." };
  }
  try {
    const { prisma } = await import("@/lib/db");
    const [itemCount, sites, lastSync, seedNotice] = await Promise.all([
      prisma.item.count({ where: { isActive: true } }),
      prisma.site.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { stocks: true } } } }),
      prisma.syncRun.findFirst({ where: { status: "SUCCESS" }, orderBy: { finishedAt: "desc" } }),
      prisma.setting.findUnique({ where: { key: "SEED_DATA_NOTICE" } }),
    ]);
    return { ok: true as const, itemCount, sites, lastSync, seedNotice: seedNotice?.value === "true" };
  } catch (e) {
    return { ok: false as const, reason: e instanceof Error ? e.message : String(e) };
  }
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-xl font-bold">새한프라텍 출고·재고 보드</h1>
      <p className="mt-1 text-sm text-gray-500">1단계: 데이터 모델 확인용 화면</p>
      <Suspense fallback={<p className="mt-6 text-sm text-gray-500">불러오는 중…</p>}>
        <Summary />
      </Suspense>
    </main>
  );
}

async function Summary() {
  const s = await loadSummary();
  if (!s.ok) {
    return (
      <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-semibold">DB에 연결하지 못했습니다</p>
        <p className="mt-1 break-all">{s.reason}</p>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-3">
      {s.seedNotice && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          지금 보이는 재고 수량은 <b>참고용 임의 데이터</b>입니다. ERP 연동 전까지 실제 재고가 아닙니다.
        </div>
      )}
      <dl className="divide-y rounded-lg border">
        <Row label="품목 수" value={`${s.itemCount}개`} />
        {s.sites.map((site) => (
          <Row key={site.code} label={`${site.name} 재고 행`} value={`${site._count.stocks}건`} />
        ))}
        <Row
          label="데이터 기준 시각"
          value={
            s.lastSync?.finishedAt
              ? s.lastSync.finishedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
              : "연동 기록 없음"
          }
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
