import "server-only";
import { prisma } from "@/lib/db";
import { calcAvailableQty, type AvailableQtyResult } from "@/lib/domain/availableQty";
import { normalizeForSearch } from "@/lib/domain/normalize";
import { checkStaleness, DEFAULT_SYNC_INTERVAL_MIN, type StalenessResult } from "@/lib/domain/staleness";

export interface AppSettings {
  siteFilterEnabled: boolean;
  syncIntervalMin: number;
  seedDataNotice: boolean;
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    siteFilterEnabled: map.SITE_FILTER_ENABLED === "true", // TODO(Q2)
    syncIntervalMin: Number(map.SYNC_INTERVAL_MIN) || DEFAULT_SYNC_INTERVAL_MIN,
    seedDataNotice: map.SEED_DATA_NOTICE === "true",
  };
}

export interface SyncStatus extends StalenessResult {
  lastSyncAt: Date | null;
  lastFailedAt: Date | null;
}

/** 데이터 기준 시각과 "오래됨" 판정 (FR-05) */
export async function getSyncStatus(intervalMin: number): Promise<SyncStatus> {
  const [ok, failed] = await Promise.all([
    prisma.syncRun.findFirst({ where: { status: "SUCCESS" }, orderBy: { finishedAt: "desc" } }),
    prisma.syncRun.findFirst({ where: { status: "FAILED" }, orderBy: { startedAt: "desc" } }),
  ]);
  const lastSyncAt = ok?.finishedAt ?? null;
  return { ...checkStaleness(lastSyncAt, new Date(), intervalMin), lastSyncAt, lastFailedAt: failed?.startedAt ?? null };
}

export interface StockRow {
  code: string;
  name: string;
  unit: string;
  packUnit: string | null;
  packQty: number | null;
  erpQty: number;
  calc: AvailableQtyResult;
  plannedQty: number; // 완료되지 않은 생산 계획 수량 합 (FR-14 "추가 생산 예정")
}

/** 재고 목록 (FR-02, FR-03, FR-06). siteCode가 없으면 사업장 합산 */
export async function getStockList(q: string, siteCode: string | null): Promise<StockRow[]> {
  const nq = normalizeForSearch(q);
  const items = await prisma.item.findMany({
    where: { isActive: true, ...(nq ? { nameNormalized: { contains: nq } } : {}) },
    orderBy: { name: "asc" },
    include: {
      stocks: siteCode ? { where: { siteCode } } : true,
      adjustments: { where: { status: "ACTIVE", ...(siteCode ? { siteCode } : {}) } },
      plans: { where: { stage: { isFinal: false }, ...(siteCode ? { siteCode } : {}) } },
    },
  });
  return items.map((it) => {
    const erpQty = it.stocks.reduce((s, r) => s + r.erpQty, 0);
    return {
      code: it.code,
      name: it.name,
      unit: it.unit,
      packUnit: it.packUnit,
      packQty: it.packQty,
      erpQty,
      calc: calcAvailableQty({ erpQty, adjustments: it.adjustments }),
      plannedQty: it.plans.reduce((s, p) => s + p.plannedQty, 0),
    };
  });
}

/** 품목 상세 (FR-04, FR-14, FR-15, FR-17) */
export async function getItemDetail(code: string, siteCode: string | null) {
  const item = await prisma.item.findUnique({
    where: { code },
    include: {
      stocks: { include: { site: true }, orderBy: { site: { sortOrder: "asc" } } },
      adjustments: {
        where: siteCode ? { siteCode } : undefined,
        include: { site: true, createdBy: { select: { name: true } }, releasedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      plans: {
        where: siteCode ? { siteCode } : undefined,
        include: { stage: true, site: true, updatedBy: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
      },
      consultNotes: {
        where: { deletedAt: null },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!item) return null;
  const stocks = siteCode ? item.stocks.filter((s) => s.siteCode === siteCode) : item.stocks;
  const erpQty = stocks.reduce((s, r) => s + r.erpQty, 0);
  const active = item.adjustments.filter((a) => a.status === "ACTIVE");
  return { item, stocks, erpQty, calc: calcAvailableQty({ erpQty, adjustments: active }), active };
}

export async function getSites() {
  return prisma.site.findMany({ orderBy: { sortOrder: "asc" } });
}
