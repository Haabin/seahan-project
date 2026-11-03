import { defineConfig, devices } from "@playwright/test";

// 화면 테스트. 실행 중인 개발 서버(기본 3010)를 쓰거나 없으면 직접 띄운다. DB는 .env의 Supabase(시드 데이터 필요).
const PORT = process.env.E2E_PORT ?? "3010";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"], // 영업사원 기준 휴대폰 세로 화면 (Chromium)
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
