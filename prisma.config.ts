import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI(마이그레이션·시드)는 풀러를 거치지 않는 DIRECT_URL을 쓴다.
// 앱 런타임은 src/lib/db.ts에서 DATABASE_URL(6543, pgbouncer)을 쓴다.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // 빌드(Vercel, prisma generate)에서는 DIRECT_URL이 없을 수 있어 빈 값으로 두고, 마이그레이션 때만 실제 값을 요구한다.
    url: process.env.DIRECT_URL ?? "",
  },
});
