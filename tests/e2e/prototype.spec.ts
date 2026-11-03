import { expect, test } from "@playwright/test";

// 시드 데이터 기준: FM00009 소주 52.5G = 음성 ERP 100, 불량 10 적용 중 → 출고 가능 90 (시나리오 3.2)
const PW = process.env.SEED_EDITOR_PASSWORD || "test1234";

async function login(page: import("@playwright/test").Page, id: string, pw: string) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(id);
  await page.getByLabel("비밀번호").fill(pw);
  await page.getByRole("button", { name: "로그인" }).click();
  if (id !== "nobody") await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("FR-01 미등록 계정은 막히고, 비로그인은 /login 으로 보낸다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await login(page, "nobody", "wrong");
  await expect(page.getByText("아이디 또는 비밀번호가 맞지 않습니다")).toBeVisible();
});

test("FR-02/03/05 로그인 후 목록·검색·기준 시각", async ({ page }) => {
  await login(page, "viewer", PW);
  await expect(page.getByText("기준 시각")).toBeVisible();
  await expect(page.getByText(/전체 \d+개 품목/)).toBeVisible();

  await page.getByPlaceholder("품명이나 규격 일부를 입력").fill("소 주"); // 띄어쓰기 무시
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByText(/검색 결과 \d+건/)).toBeVisible();
  await expect(page.getByText("소주 52.5G [PCO]")).toBeVisible();

  // FR-03 1초 이내: 첫 검색은 개발 서버 컴파일이 섞이므로 두 번째 검색으로 잰다 (운영 빌드에서 재측정, NFR-05)
  const t0 = Date.now();
  await page.getByPlaceholder("품명이나 규격 일부를 입력").fill("원터치");
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByText("원터치 38G CL")).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(process.env.CI ? 1500 : 5000);
});

test("FR-04/07/08 상세에서 출고 가능 90 → 변동 입력 → 80 → 해제 → 90", async ({ page }) => {
  await login(page, "editor", PW);
  await page.goto("/items/FM00009");
  await expect(page.getByRole("heading", { name: "소주 52.5G [PCO]" })).toBeVisible();
  await expect(page.getByText("출고 가능 수량").locator("..").getByText("90", { exact: false })).toBeVisible();
  await expect(page.getByText("− 불량")).toBeVisible();

  // 변동 입력: 보류 10 → 80
  await page.locator('select[name="type"]').selectOption("HOLD");
  await page.locator('input[name="qty"]').fill("10");
  await page.locator('input[name="reason"]').fill("E2E 테스트 보류");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("저장됐습니다")).toBeVisible();
  await expect(page.getByText(/^80\s*개$/)).toBeVisible();

  // 해제 → 다시 90, 해제 기록은 남음
  const row = page.locator("div", { hasText: "E2E 테스트 보류" }).filter({ has: page.getByRole("button", { name: "해제" }) }).last();
  await row.getByRole("button", { name: "해제" }).click();
  await expect(page.getByText(/^90\s*개$/)).toBeVisible();
  await expect(page.getByText(/해제된 변동 \d+건/)).toBeVisible();
});

test("viewer 는 변동 입력 폼이 보이지 않는다", async ({ page }) => {
  await login(page, "viewer", PW);
  await page.goto("/items/FM00009");
  await expect(page.getByRole("heading", { name: "소주 52.5G [PCO]" })).toBeVisible();
  await expect(page.getByText("변동 입력 (불량·보류 등)")).toHaveCount(0);
  await expect(page.getByText("상담 메모 쓰기")).toBeVisible();
});
