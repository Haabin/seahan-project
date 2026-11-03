/**
 * 출고 가능 수량 계산 (정의서 5장, CLAUDE.md 규칙 1·2, FR-04)
 *
 *   출고 가능 수량 = ERP 재고 − 적용 중인 변동(불량·보류·출고 예정·기타)의 합
 *   - 해제된(RELEASED) 변동은 계산에서 뺀다. 기록은 남는다.
 *   - 결과가 0 미만이면 0으로 표시하고 경고 플래그를 세운다.
 *
 * DB·프레임워크에 의존하지 않는 순수 함수. 단위 테스트: tests/unit/availableQty.test.ts
 */

export const ADJUSTMENT_TYPES = ["DEFECT", "HOLD", "SHIP_PLANNED", "OTHER"] as const;
export type AdjustmentTypeCode = (typeof ADJUSTMENT_TYPES)[number];

export const ADJUSTMENT_TYPE_LABEL: Record<AdjustmentTypeCode, string> = {
  DEFECT: "불량",
  HOLD: "보류",
  SHIP_PLANNED: "출고 예정",
  OTHER: "기타",
};

export type AdjustmentStatusCode = "ACTIVE" | "RELEASED";

export interface AdjustmentInput {
  type: AdjustmentTypeCode;
  qty: number;
  status: AdjustmentStatusCode;
}

export interface AvailableQtyInput {
  erpQty: number;
  adjustments: ReadonlyArray<AdjustmentInput>;
}

export interface AvailableQtyResult {
  /** 화면에 표시할 출고 가능 수량 (0 이상) */
  available: number;
  /** 적용 중인 변동의 합 */
  deductedTotal: number;
  /** 유형별 차감 합 (적용 중인 것만) */
  byType: Record<AdjustmentTypeCode, number>;
  /** ERP 재고 − 차감이 음수였는지 (차감이 재고보다 큼) */
  isNegative: boolean;
  /** 원래 계산값 (음수 가능). 경고 문구 등에 사용 */
  rawAvailable: number;
  warning?: string;
}

function assertNonNegativeInt(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label}은(는) 0 이상의 정수여야 합니다. 받은 값: ${value}`);
  }
}

export function calcAvailableQty(input: AvailableQtyInput): AvailableQtyResult {
  assertNonNegativeInt(input.erpQty, "ERP 재고");

  const byType: Record<AdjustmentTypeCode, number> = {
    DEFECT: 0,
    HOLD: 0,
    SHIP_PLANNED: 0,
    OTHER: 0,
  };

  for (const adj of input.adjustments) {
    if (!Number.isInteger(adj.qty) || adj.qty <= 0) {
      throw new RangeError(`변동 수량은 1 이상의 정수여야 합니다. 받은 값: ${adj.qty}`);
    }
    if (adj.status !== "ACTIVE") continue; // 해제된 변동은 제외
    byType[adj.type] += adj.qty;
  }

  const deductedTotal = ADJUSTMENT_TYPES.reduce((sum, t) => sum + byType[t], 0);
  const rawAvailable = input.erpQty - deductedTotal;
  const isNegative = rawAvailable < 0;

  return {
    available: isNegative ? 0 : rawAvailable,
    deductedTotal,
    byType,
    isNegative,
    rawAvailable,
    warning: isNegative
      ? `차감 수량(${deductedTotal})이 ERP 재고(${input.erpQty})보다 많습니다. 변동 입력을 확인하세요.`
      : undefined,
  };
}
