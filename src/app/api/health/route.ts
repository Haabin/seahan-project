import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkStaleness } from "@/lib/domain/staleness";

/** NFR-01 상태 확인: DB 연결과 마지막 연동 시각. 외부 모니터링·에이전트가 호출한다 */
export async function GET() {
  try {
    const [last, interval] = await Promise.all([
      prisma.syncRun.findFirst({ where: { status: "SUCCESS" }, orderBy: { finishedAt: "desc" } }),
      prisma.setting.findUnique({ where: { key: "SYNC_INTERVAL_MIN" } }),
    ]);
    const stale = checkStaleness(last?.finishedAt ?? null, new Date(), Number(interval?.value) || 15);
    return NextResponse.json({ ok: true, db: "up", lastSyncAt: last?.finishedAt ?? null, ...stale });
  } catch (e) {
    return NextResponse.json({ ok: false, db: "down", error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
