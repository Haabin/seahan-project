import { describe, expect, it } from "vitest";
import { normalizeForSearch } from "@/lib/domain/normalize";

describe("normalizeForSearch — 검색어 정규화 (FR-03)", () => {
  it("공백을 모두 지우고 소문자로 만든다", () => {
    expect(normalizeForSearch("CJ 올리고당 1.2")).toBe("cj올리고당1.2");
    expect(normalizeForSearch("  지평 1.7L 쌀막걸리 [ALC 40G WT]  ")).toBe("지평1.7l쌀막걸리[alc40gwt]");
  });

  it("전각 공백과 탭도 지운다", () => {
    expect(normalizeForSearch("원터치　49G\t[CL]")).toBe("원터치49g[cl]");
  });

  it("자모 분리된 한글(NFD)을 조합형(NFC)으로 통일한다", () => {
    const nfd = "올리고당".normalize("NFD");
    expect(normalizeForSearch(nfd)).toBe("올리고당");
  });

  it("품명 일부로 부분 일치가 되도록 같은 함수를 양쪽에 쓴다", () => {
    const stored = normalizeForSearch("CJ 올리고당 1.2");
    expect(stored.includes(normalizeForSearch("올리고 당"))).toBe(true);
    expect(stored.includes(normalizeForSearch("cj 1.2"))).toBe(false);
  });
});
