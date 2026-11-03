import { describe, expect, it } from "vitest";
import { dateOnlyFromToday, fmtDate, parseDateOnly } from "@/lib/format";

describe("날짜 전용 값 (완료 예정일·희망 납기) — 하루 밀림 방지", () => {
  it("parseDateOnly 는 UTC 자정으로 만든다", () => {
    const d = parseDateOnly("2026-12-05");
    expect(d.toISOString()).toBe("2026-12-05T00:00:00.000Z");
  });

  it("fmtDate 는 저장한 날짜 그대로 보여준다 (KST 환경에서도 12/4가 되지 않음)", () => {
    expect(fmtDate(parseDateOnly("2026-12-05"))).toBe("2026. 12. 5.");
  });

  it("잘못된 형식은 예외", () => {
    expect(() => parseDateOnly("2026/12/05")).toThrow(RangeError);
    expect(() => parseDateOnly("2026-13-40")).toThrow(RangeError);
  });

  it("dateOnlyFromToday 는 한국 날짜 기준으로 n일 뒤 UTC 자정", () => {
    // 2026-11-03 23:30 KST = 2026-11-03T14:30Z → 한국 날짜는 11/3, +32일 = 12/5
    const now = new Date("2026-11-03T14:30:00Z");
    expect(dateOnlyFromToday(32, now).toISOString()).toBe("2026-12-05T00:00:00.000Z");
    // 2026-11-03 08:30 KST = 11/02 23:30Z → 한국 날짜는 11/3 이어야 함
    expect(dateOnlyFromToday(0, new Date("2026-11-02T23:30:00Z")).toISOString()).toBe("2026-11-03T00:00:00.000Z");
  });

  it("비교 연산이 날짜 단위로 안정적이다", () => {
    expect(parseDateOnly("2026-11-22") < parseDateOnly("2026-12-05")).toBe(true);
    expect(parseDateOnly("2026-12-05") < parseDateOnly("2026-12-05")).toBe(false);
  });
});
