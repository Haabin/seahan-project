/**
 * 검색용 문자열 정규화 (FR-03: 부분 일치, 띄어쓰기 무시)
 * - 모든 공백(전각 포함) 제거
 * - 소문자화
 * - 유니코드 정규화(NFC)로 한글 자모 분리 형태 통일
 *
 * 품목의 nameNormalized 저장과 검색어 처리 양쪽에서 같은 함수를 쓴다.
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\s　]+/g, "")
    .toLowerCase();
}
