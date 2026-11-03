import { PrismaClient } from "../../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Vercel 서버리스에서는 Supabase 트랜잭션 풀러(DATABASE_URL, 6543)를 쓴다.
// 개발 서버 핫리로드 시 커넥션이 늘어나지 않도록 global에 하나만 둔다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL 환경 변수가 없습니다. .env.example을 참고해 .env를 만드세요.");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
