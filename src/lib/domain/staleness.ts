/**
 * 데이터 기준 시각 지연 판정 (CLAUDE.md 규칙 3, FR-05)
 * 마지막 연동이 예정 주기의 2배보다 오래되면 "데이터가 오래됨".
 */

export const DEFAULT_SYNC_INTERVAL_MIN = 15;
export const STALE_MULTIPLIER = 2;

export interface StalenessResult {
  isStale: boolean;
  /** 마지막 연동 후 경과 분 (연동 기록이 없으면 null) */
  ageMinutes: number | null;
  /** 지연으로 판정되는 기준 분 */
  thresholdMinutes: number;
}

export function checkStaleness(
  lastSyncAt: Date | null | undefined,
  now: Date,
  intervalMin: number = DEFAULT_SYNC_INTERVAL_MIN,
): StalenessResult {
  if (!Number.isFinite(intervalMin) || intervalMin <= 0) {
    throw new RangeError(`연동 주기는 양수여야 합니다. 받은 값: ${intervalMin}`);
  }
  const thresholdMinutes = intervalMin * STALE_MULTIPLIER;
  if (!lastSyncAt) {
    return { isStale: true, ageMinutes: null, thresholdMinutes };
  }
  const ageMinutes = (now.getTime() - lastSyncAt.getTime()) / 60_000;
  return { isStale: ageMinutes > thresholdMinutes, ageMinutes, thresholdMinutes };
}

export function isStale(lastSyncAt: Date | null | undefined, now: Date, intervalMin?: number): boolean {
  return checkStaleness(lastSyncAt, now, intervalMin).isStale;
}
