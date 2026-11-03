// E2E 시작 전: 이전 실행이 남긴 "E2E" 접두 데이터를 지워 시드 상태(FM00009 → 90)로 되돌린다.
// Playwright의 globalSetup은 CJS로 로드되어 Prisma 생성 클라이언트(ESM)를 못 쓰므로 pg로 직접 지운다.
import "dotenv/config";
import { Client } from "pg";

export default async function globalSetup() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("E2E에는 .env의 DIRECT_URL이 필요합니다.");
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    const adj = await c.query(`DELETE FROM "Adjustment" WHERE reason LIKE 'E2E%'`);
    await c.query(
      `DELETE FROM "ConsultNoteHistory" WHERE "noteId" IN (SELECT id FROM "ConsultNote" WHERE content LIKE 'E2E%')`,
    );
    const notes = await c.query(`DELETE FROM "ConsultNote" WHERE content LIKE 'E2E%'`);
    console.log(`[e2e] 잔여 데이터 정리: 변동 ${adj.rowCount}건, 메모 ${notes.rowCount}건`);
  } finally {
    await c.end();
  }
}
