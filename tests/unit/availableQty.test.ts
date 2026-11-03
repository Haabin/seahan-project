import { describe, expect, it } from "vitest";
import { calcAvailableQty, type AdjustmentInput } from "@/lib/domain/availableQty";

const defect = (qty: number, status: AdjustmentInput["status"] = "ACTIVE"): AdjustmentInput => ({
  type: "DEFECT",
  qty,
  status,
});

describe("calcAvailableQty — 출고 가능 수량 (FR-04, 정의서 5장)", () => {
  it("ERP 100, 불량 10 적용 중 → 90 (시나리오 3.2)", () => {
    const r = calcAvailableQty({ erpQty: 100, adjustments: [defect(10)] });
    expect(r.available).toBe(90);
    expect(r.deductedTotal).toBe(10);
    expect(r.byType.DEFECT).toBe(10);
    expect(r.isNegative).toBe(false);
    expect(r.warning).toBeUndefined();
  });

  it("해제된 변동은 계산에서 제외한다 (FR-08, 이중 차감 방지)", () => {
    const r = calcAvailableQty({
      erpQty: 100,
      adjustments: [defect(10, "RELEASED"), defect(5)],
    });
    expect(r.available).toBe(95);
    expect(r.deductedTotal).toBe(5);
  });

  it("변동이 없으면 ERP 재고를 그대로 돌려준다", () => {
    const r = calcAvailableQty({ erpQty: 42, adjustments: [] });
    expect(r.available).toBe(42);
    expect(r.deductedTotal).toBe(0);
  });

  it("여러 유형을 합산하고 유형별 내역을 준다 (차감 내역 펼쳐보기)", () => {
    const r = calcAvailableQty({
      erpQty: 1000,
      adjustments: [
        { type: "DEFECT", qty: 10, status: "ACTIVE" },
        { type: "DEFECT", qty: 15, status: "ACTIVE" },
        { type: "HOLD", qty: 100, status: "ACTIVE" },
        { type: "SHIP_PLANNED", qty: 300, status: "ACTIVE" },
        { type: "OTHER", qty: 1, status: "RELEASED" },
      ],
    });
    expect(r.byType).toEqual({ DEFECT: 25, HOLD: 100, SHIP_PLANNED: 300, OTHER: 0 });
    expect(r.deductedTotal).toBe(425);
    expect(r.available).toBe(575);
  });

  it("결과가 음수면 0으로 표시하고 경고 플래그를 세운다 (규칙 1)", () => {
    const r = calcAvailableQty({ erpQty: 30, adjustments: [defect(50)] });
    expect(r.available).toBe(0);
    expect(r.rawAvailable).toBe(-20);
    expect(r.isNegative).toBe(true);
    expect(r.warning).toContain("ERP 재고(30)");
  });

  it("차감이 재고와 정확히 같으면 0이고 경고는 없다", () => {
    const r = calcAvailableQty({ erpQty: 50, adjustments: [defect(50)] });
    expect(r.available).toBe(0);
    expect(r.isNegative).toBe(false);
  });

  it("변동 수량이 0 이하이거나 정수가 아니면 예외", () => {
    expect(() => calcAvailableQty({ erpQty: 10, adjustments: [defect(0)] })).toThrow(RangeError);
    expect(() => calcAvailableQty({ erpQty: 10, adjustments: [defect(-3)] })).toThrow(RangeError);
    expect(() => calcAvailableQty({ erpQty: 10, adjustments: [defect(1.5)] })).toThrow(RangeError);
  });

  it("ERP 재고가 음수이거나 정수가 아니면 예외", () => {
    expect(() => calcAvailableQty({ erpQty: -1, adjustments: [] })).toThrow(RangeError);
    expect(() => calcAvailableQty({ erpQty: 2.5, adjustments: [] })).toThrow(RangeError);
  });
});
