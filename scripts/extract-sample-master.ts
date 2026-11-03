/**
 * docs/sample/ 실적 파일(CP949 TSV, 확장자 .xls)에서 시드용 품목·거래선 마스터를 뽑아
 * prisma/seed-data/items.json, customers.json 으로 저장한다.
 *
 * 실행: npm run db:extract
 * 원본 .xls 는 git에 없으므로, 생성된 JSON을 커밋해 시드가 원본 없이도 돌게 한다.
 * 형식 설명: docs/sample/README.md
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SAMPLE_DIR = path.join(ROOT, "docs", "sample");
const OUT_DIR = path.join(ROOT, "prisma", "seed-data");
const YEAR = "2025";
const PRODUCTION_FILES = ["1211", "1212", "1219"].map((d) => `${YEAR}년 생산실적(${d}).xls`);
const SALES_FILE = `${YEAR}년 판매실적.xls`;
const OWN_PRODUCT_PREFIXES = ["TM", "TR", "FM"]; // 자사 생산품 (README 3장)
const ITEM_LIMIT = 40;
const CUSTOMER_LIMIT = 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function readTsv(file: string): string[][] {
  const buf = fs.readFileSync(file);
  const text = new TextDecoder("euc-kr").decode(buf);
  return text
    .split("\n")
    .map((line) => line.replace(/\r$/, "").split("\t").map((c) => c.trim()))
    .filter((cols) => DATE_RE.test(cols[0] ?? "")); // 헤더·합계 행 제외
}

interface ItemAgg {
  code: string;
  name: string;
  variantCode: string;
  packUnit: string | null;
  packQty: number | null;
  capacityMl: number | null;
  production2025: number;
}

function toInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function main() {
  const missing = [...PRODUCTION_FILES, SALES_FILE].filter((f) => !fs.existsSync(path.join(SAMPLE_DIR, f)));
  if (missing.length) {
    console.log(`docs/sample/ 에 파일이 없어 건너뜁니다: ${missing.join(", ")}`);
    console.log("기존 prisma/seed-data/*.json 을 그대로 사용합니다.");
    return;
  }

  // 생산실적: 품번별 2025 A급 합계
  const items = new Map<string, ItemAgg>();
  for (const f of PRODUCTION_FILES) {
    for (const c of readTsv(path.join(SAMPLE_DIR, f))) {
      const code = c[5];
      if (!code || !OWN_PRODUCT_PREFIXES.includes(code.slice(0, 2))) continue;
      const cur = items.get(code) ?? {
        code,
        name: c[7],
        variantCode: c[6],
        packUnit: c[9] && c[9] !== "없음" ? c[9] : null,
        packQty: toInt(c[13]),
        capacityMl: null,
        production2025: 0,
      };
      cur.production2025 += toInt(c[14]) ?? 0;
      items.set(code, cur);
    }
  }

  // 판매실적: 용량·포장단위 보강, 거래선 집계
  const customers = new Map<string, number>();
  for (const c of readTsv(path.join(SAMPLE_DIR, SALES_FILE))) {
    const code = c[4];
    const it = items.get(code);
    if (it) {
      if (it.capacityMl == null) {
        const cap = toInt(c[8]);
        if (cap && cap > 0) it.capacityMl = cap;
      }
      if (it.packUnit == null && c[9] && c[9] !== "없음" && !/^\d+\*\d+$/.test(c[9])) {
        it.packUnit = c[9];
        it.packQty = it.packQty ?? toInt(c[10]);
      }
    }
    const customer = c[7];
    if (customer && c[2] === "정상") {
      customers.set(customer, (customers.get(customer) ?? 0) + (toInt(c[12]) ?? 0));
    }
  }

  const topItems = [...items.values()]
    .filter((i) => i.name)
    .sort((a, b) => b.production2025 - a.production2025)
    .slice(0, ITEM_LIMIT);
  const topCustomers = [...customers.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, CUSTOMER_LIMIT)
    .map(([name, shipped2025]) => ({ name, shipped2025 }));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "items.json"),
    JSON.stringify({ _note: "docs/sample 2025 실적에서 추출한 품목 마스터 (자사 생산품, 생산량 상위). 재고 수량은 없음.", items: topItems }, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "customers.json"),
    JSON.stringify({ _note: "docs/sample 2025 판매실적 거래선 (정상 출고 수량 상위). 상담 메모 자동완성용.", customers: topCustomers }, null, 2) + "\n",
  );
  console.log(`품목 ${topItems.length}개, 거래선 ${topCustomers.length}곳 → ${path.relative(ROOT, OUT_DIR)}/`);
}

main();
