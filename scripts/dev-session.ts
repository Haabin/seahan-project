// 개발용: 지정 계정의 세션 쿠키 값을 만든다. 사용: npx tsx scripts/dev-session.ts editor
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }) });
(async () => {
  const u = await p.user.findUniqueOrThrow({ where: { loginId: process.argv[2] ?? "editor" } });
  const id = "test-" + Date.now();
  await p.session.create({ data: { id, userId: u.id, expiresAt: new Date(Date.now() + 3600e3) } });
  console.log(id);
  await p.$disconnect();
})();
