const KST = "Asia/Seoul";

export const fmtNum = (n: number) => n.toLocaleString("ko-KR");

export const fmtDateTime = (d: Date | null | undefined) =>
  d ? d.toLocaleString("ko-KR", { timeZone: KST, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "-";

export const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("ko-KR", { timeZone: KST, year: "numeric", month: "numeric", day: "numeric" }) : "-";

export const fmtAge = (minutes: number | null) => {
  if (minutes == null) return "연동 기록 없음";
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${Math.floor(minutes)}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1440)}일 전`;
};
