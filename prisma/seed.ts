/**
 * 샘플 시드 — ★ 참고용 임의 데이터 ★
 *
 * - 품목(prisma/seed-data/items.json)과 거래선(customers.json)은 기업이 준 2025 실적에서 뽑은 실제 코드·이름이다.
 * - ERP 재고 수량, 사업장 배분, 변동, 생산 계획, 상담 메모는 실적 데이터에 없으므로 **임의로 만든 값**이다.
 *   운영 데이터가 아니며, 화면에는 Setting.SEED_DATA_NOTICE 로 안내 문구를 띄운다.
 * - 여러 번 실행해도 중복이 생기지 않도록 고정 id/키로 upsert 한다.
 * - 시나리오 3.2(ERP 100, 불량 10 → 90)와 3.4(재고 120, 500개 생산 예정)를 그대로 재현하는 품목을 둔다.
 *
 * 실행: npx prisma db seed  (prisma.config.ts → tsx prisma/seed.ts)
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
import { normalizeForSearch } from "../src/lib/domain/normalize";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL(또는 DATABASE_URL)이 .env 에 없습니다.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// ---------- 입력 데이터 ----------
interface SeedItem {
  code: string;
  name: string;
  variantCode: string;
  packUnit: string | null;
  packQty: number | null;
  capacityMl: number | null;
}
const dataDir = path.join(__dirname, "seed-data");
const { items } = JSON.parse(fs.readFileSync(path.join(dataDir, "items.json"), "utf8")) as { items: SeedItem[] };
const { customers } = JSON.parse(fs.readFileSync(path.join(dataDir, "customers.json"), "utf8")) as {
  customers: { name: string }[];
};

// 결정적 난수 (재실행 시 같은 값)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261103);
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
// 날짜 전용 컬럼(@db.Date)은 UTC 자정으로 저장한다 (src/lib/format.ts dateOnlyFromToday 와 같은 규칙)
const daysFromNow = (d: number) => {
  const kst = new Date(Date.now() + 9 * 3600_000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) + d * 86_400_000);
};

const SITES = [
  { code: "EUMSEONG", name: "음성", sortOrder: 1 },
  { code: "CHEONGJU", name: "청주", sortOrder: 2 },
];
const STAGES = [
  { code: "PLANNED", name: "계획", sortOrder: 1, isFinal: false },
  { code: "MOLDING", name: "사출 중", sortOrder: 2, isFinal: false },
  { code: "INSPECTING", name: "검사 중", sortOrder: 3, isFinal: false },
  { code: "DONE", name: "완료", sortOrder: 4, isFinal: true },
];
const SETTINGS: Record<string, string> = {
  SITE_FILTER_ENABLED: "false", // TODO(Q2)
  SYNC_INTERVAL_MIN: "15",
  SEED_DATA_NOTICE: "true", // 참고용 임의 데이터 안내 표시
};

async function main() {
  if (items.length < 3) throw new Error("seed-data/items.json 에 품목이 3개 이상 필요합니다. npm run db:extract 를 먼저 실행하세요.");

  // 1. 코드·설정
  for (const s of SITES) await prisma.site.upsert({ where: { code: s.code }, update: s, create: s });
  for (const s of STAGES) await prisma.processStage.upsert({ where: { code: s.code }, update: s, create: s });
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } }); // 기존 값은 유지
  }

  // 2. 사용자 (비밀번호는 .env, 기본 test1234)
  const users = [
    { loginId: "admin", name: "운영 관리자", role: "ADMIN" as const, pw: process.env.SEED_ADMIN_PASSWORD },
    { loginId: "editor", name: "생산지원팀", role: "EDITOR" as const, pw: process.env.SEED_EDITOR_PASSWORD },
    { loginId: "viewer", name: "영업사원", role: "VIEWER" as const, pw: process.env.SEED_VIEWER_PASSWORD },
  ];
  const userIds: Record<string, string> = {};
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.pw || "test1234", 10);
    const row = await prisma.user.upsert({
      where: { loginId: u.loginId },
      update: { name: u.name, role: u.role, passwordHash, isActive: true },
      create: { loginId: u.loginId, name: u.name, role: u.role, passwordHash },
    });
    userIds[u.loginId] = row.id;
  }

  // 3. 품목·거래선 (실적 데이터 기반)
  for (const it of items) {
    const data = {
      name: it.name,
      nameNormalized: normalizeForSearch(it.name),
      variantCode: it.variantCode || null,
      capacityMl: it.capacityMl,
      packUnit: it.packUnit,
      packQty: it.packQty,
      unit: "개",
      isActive: true,
    };
    await prisma.item.upsert({ where: { code: it.code }, update: data, create: { code: it.code, ...data } });
  }
  for (const c of customers) {
    await prisma.customer.upsert({ where: { name: c.name }, update: {}, create: { name: c.name } });
  }

  // 4. 연동 기록 (시드 1건) + ERP 재고 — ★ 임의 수량 ★
  const capturedAt = new Date();
  let syncRun = await prisma.syncRun.findFirst({ where: { source: "SEED" }, orderBy: { id: "desc" } });
  if (!syncRun) {
    syncRun = await prisma.syncRun.create({ data: { kind: "BASELINE", source: "SEED", status: "SUCCESS" } });
  }
  await prisma.syncRun.update({
    where: { id: syncRun.id },
    data: { finishedAt: capturedAt, itemCount: items.length * SITES.length, status: "SUCCESS" },
  });
  await prisma.erpStockHistory.deleteMany({ where: { syncRunId: syncRun.id } });

  const [scenarioA, scenarioB, scenarioC] = items; // 3.2 / 3.4 / 음수 경고
  for (const it of items) {
    for (const s of SITES) {
      let erpQty = it.packQty ? it.packQty * randInt(5, 60) : randInt(500, 50_000);
      // 시나리오 품목은 다른 사업장 재고를 0으로 두어 합산 화면에서도 100→90, 120, 30이 그대로 보이게 한다
      if (it.code === scenarioA.code) erpQty = s.code === "EUMSEONG" ? 100 : 0;
      if (it.code === scenarioB.code) erpQty = s.code === "EUMSEONG" ? 120 : 0;
      if (it.code === scenarioC.code) erpQty = s.code === "CHEONGJU" ? 30 : 0;
      const key = { itemCode: it.code, siteCode: s.code };
      await prisma.erpStock.upsert({
        where: { itemCode_siteCode: key },
        update: { erpQty, capturedAt, syncRunId: syncRun.id },
        create: { ...key, erpQty, capturedAt, syncRunId: syncRun.id },
      });
      await prisma.erpStockHistory.create({ data: { ...key, erpQty, capturedAt, syncRunId: syncRun.id } });
    }
  }

  // 5. 변동 예시 — ★ 임의 ★ (적용 중 4, 해제 2)
  const editor = userIds.editor;
  const adjustments = [
    { id: "seed-adj-01", itemCode: scenarioA.code, siteCode: "EUMSEONG", type: "DEFECT", qty: 10, reason: "출고 전 검사 불량 10개 (시나리오 3.2)", status: "ACTIVE" },
    { id: "seed-adj-02", itemCode: scenarioC.code, siteCode: "CHEONGJU", type: "HOLD", qty: 50, reason: "고객 클레임 보류 (재고 초과 → 경고 사례)", status: "ACTIVE" },
    { id: "seed-adj-03", itemCode: items[3].code, siteCode: "EUMSEONG", type: "SHIP_PLANNED", qty: items[3].packQty ?? 1000, reason: "11/5 배차 확정분", status: "ACTIVE" },
    { id: "seed-adj-04", itemCode: items[4].code, siteCode: "CHEONGJU", type: "OTHER", qty: 200, reason: "샘플 출고 예정", status: "ACTIVE" },
    { id: "seed-adj-05", itemCode: scenarioA.code, siteCode: "EUMSEONG", type: "DEFECT", qty: 5, reason: "지난주 불량 (ERP 반영 완료)", status: "RELEASED", releaseNote: "ERP 반영 확인" },
    { id: "seed-adj-06", itemCode: items[5].code, siteCode: "EUMSEONG", type: "HOLD", qty: 300, reason: "라벨 오류 보류", status: "RELEASED", releaseNote: "재작업 완료" },
  ] as const;
  for (const a of adjustments) {
    const released = a.status === "RELEASED";
    const data = {
      itemCode: a.itemCode,
      siteCode: a.siteCode,
      type: a.type,
      qty: a.qty,
      reason: a.reason,
      status: a.status,
      createdById: editor,
      releasedById: released ? editor : null,
      releasedAt: released ? daysFromNow(-2) : null,
      releaseNote: released ? a.releaseNote : null,
    };
    await prisma.adjustment.upsert({ where: { id: a.id }, update: data, create: { id: a.id, ...data } });
  }

  // 6. 생산 계획 — ★ 임의 ★ (시나리오 3.4: 500개, 완료 예정 +32일, 사출 중)
  const plans = [
    { id: "seed-plan-01", itemCode: scenarioB.code, siteCode: "EUMSEONG", plannedQty: 500, start: -3, due: 32, stageCode: "MOLDING", memo: "시나리오 3.4" },
    { id: "seed-plan-02", itemCode: scenarioA.code, siteCode: "EUMSEONG", plannedQty: 2000, start: 7, due: 14, stageCode: "PLANNED", memo: null },
    { id: "seed-plan-03", itemCode: items[6].code, siteCode: "CHEONGJU", plannedQty: 12000, start: -5, due: 2, stageCode: "INSPECTING", memo: "검사 지연 가능" },
    { id: "seed-plan-04", itemCode: items[7].code, siteCode: "CHEONGJU", plannedQty: 6000, start: -10, due: -1, stageCode: "DONE", memo: "ERP 입고 완료" },
    { id: "seed-plan-05", itemCode: items[8].code, siteCode: "EUMSEONG", plannedQty: 3000, start: 20, due: 30, stageCode: "PLANNED", memo: null },
  ];
  for (const p of plans) {
    const data = {
      itemCode: p.itemCode,
      siteCode: p.siteCode,
      plannedQty: p.plannedQty,
      startDate: daysFromNow(p.start),
      dueDate: daysFromNow(p.due),
      stageCode: p.stageCode,
      memo: p.memo,
      createdById: editor,
      updatedById: editor,
    };
    await prisma.productionPlan.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } });
  }

  // 7. 상담 메모 — ★ 임의 ★ (고객명은 거래선 목록에서)
  const viewer = userIds.viewer;
  const notes = [
    { id: "seed-note-01", itemCode: scenarioB.code, customerName: customers[0]?.name ?? "거래선A", requestedQty: 300, desired: 37, content: "300개 희망. 생산 완료 예정일 이후 출고 가능 안내함 (시나리오 3.4)", status: "OPEN" as const },
    { id: "seed-note-02", itemCode: scenarioB.code, customerName: customers[1]?.name ?? "거래선B", requestedQty: 200, desired: 20, content: "희망 납기가 완료 예정일보다 빠름 → 강조 대상", status: "OPEN" as const },
    { id: "seed-note-03", itemCode: items[9].code, customerName: customers[2]?.name ?? "거래선C", requestedQty: 1000, desired: 10, content: "재고 충분, 수주 전환", status: "CONVERTED" as const },
  ];
  for (const n of notes) {
    const data = {
      itemCode: n.itemCode,
      customerName: n.customerName,
      requestedQty: n.requestedQty,
      desiredDate: daysFromNow(n.desired),
      content: n.content,
      status: n.status,
      authorId: viewer,
    };
    const row = await prisma.consultNote.upsert({ where: { id: n.id }, update: data, create: { id: n.id, ...data } });
    const hasHistory = await prisma.consultNoteHistory.findFirst({ where: { noteId: row.id, action: "CREATE" } });
    if (!hasHistory) {
      await prisma.consultNoteHistory.create({ data: { noteId: row.id, action: "CREATE", snapshot: data, actorId: viewer } });
    }
  }

  const counts = {
    items: await prisma.item.count(),
    customers: await prisma.customer.count(),
    stocks: await prisma.erpStock.count(),
    adjustments: await prisma.adjustment.count(),
    plans: await prisma.productionPlan.count(),
    notes: await prisma.consultNote.count(),
    users: await prisma.user.count(),
  };
  console.log("시드 완료 (참고용 임의 데이터):", counts);
  console.log(`시나리오 3.2 품목: ${scenarioA.code} ${scenarioA.name} (음성 ERP 100, 불량 10 → 90)`);
  console.log(`시나리오 3.4 품목: ${scenarioB.code} ${scenarioB.name} (음성 ERP 120, 500개 생산 예정)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
