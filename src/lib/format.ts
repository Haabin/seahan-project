const KST = "Asia/Seoul";

export const fmtNum = (n: number) => n.toLocaleString("ko-KR");

/** 시각(타임스탬프) 표시: 한국 시간 */
export const fmtDateTime = (d: Date | null | undefined) =>
  d ? d.toLocaleString("ko-KR", { timeZone: KST, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "-";

/**
 * 날짜만 있는 값(@db.Date: 완료 예정일, 희망 납기) 표시.
 * 날짜 컬럼은 항상 UTC 자정으로 저장하므로(parseDateOnly) UTC 기준으로 읽어야 하루가 밀리지 않는다.
 */
export const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("ko-KR", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" }) : "-";

/** "2026-12-05" → UTC 자정 Date. 날짜 전용 컬럼에 저장할 때 사용 */
export function parseDateOnly(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new RangeError(`날짜 형식이 아닙니다: ${s}`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new RangeError(`잘못된 날짜: ${s}`);
  return d;
}

/** 오늘(한국 날짜) 기준 n일 뒤의 날짜 전용 값(UTC 자정) */
export function dateOnlyFromToday(days: number, now: Date = new Date()): Date {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const base = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  return new Date(base + days * 86_400_000);
}

export const fmtAge = (minutes: number | null) => {
  if (minutes == null) return "연동 기록 없음";
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${Math.floor(minutes)}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1440)}일 전`;
};
