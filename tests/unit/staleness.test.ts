import { describe, expect, it } from "vitest";
import { checkStaleness, isStale } from "@/lib/domain/staleness";

const t = (iso: string) => new Date(iso);

describe("checkStaleness — 데이터가 오래됨 판정 (FR-05, 규칙 3)", () => {
  const now = t("2026-11-03T10:00:00+09:00");

  it("주기 15분: 30분 이내면 정상", () => {
    expect(isStale(t("2026-11-03T09:45:00+09:00"), now, 15)).toBe(false);
    expect(isStale(t("2026-11-03T09:30:00+09:00"), now, 15)).toBe(false); // 정확히 2배는 아직 정상
  });

  it("주기 15분: 30분을 넘기면 오래됨", () => {
    const r = checkStaleness(t("2026-11-03T09:29:00+09:00"), now, 15);
    expect(r.isStale).toBe(true);
    expect(r.ageMinutes).toBe(31);
    expect(r.thresholdMinutes).toBe(30);
  });

  it("연동 기록이 없으면 오래됨으로 본다", () => {
    const r = checkStaleness(null, now);
    expect(r.isStale).toBe(true);
    expect(r.ageMinutes).toBeNull();
  });

  it("기본 주기는 15분", () => {
    expect(checkStaleness(now, now).thresholdMinutes).toBe(30);
  });

  it("주기가 0 이하이면 예외", () => {
    expect(() => checkStaleness(now, now, 0)).toThrow(RangeError);
  });
});
