import { expect, test } from "@playwright/test";

// 정의서 6.4: 영업사원이 메모를 쓰고, "내 메모"에서 상태를 바꾸고, 삭제한다 (FR-17, NFR-09)
const PW = process.env.SEED_VIEWER_PASSWORD || "test1234";

test("상담 메모 작성 → 내 메모 → 상태 변경 → 삭제", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("아이디").fill("viewer");
  await page.getByLabel("비밀번호").fill(PW);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  // 품목 상세에서 메모 작성 (1분 안에 입력 가능한 짧은 폼)
  await page.goto("/items/FM00022");
  await page.locator('input[name="customerName"]').fill("E2E 거래처");
  await page.locator('input[name="requestedQty"]').fill("777");
  await page.locator('input[name="desiredDate"]').fill("2026-12-24");
  await page.locator('textarea[name="content"]').fill("E2E 테스트 메모");
  await page.getByRole("button", { name: "메모 저장" }).click();
  await expect(page.getByText("메모가 저장됐습니다.")).toBeVisible();
  await expect(page.getByText("희망 납기 2026. 12. 24.").first()).toBeVisible(); // 날짜 하루 밀림 없음

  // 하단 탭 "내 메모"
  await page.getByRole("link", { name: "내 메모", exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);
  const card = page.locator("li", { hasText: "E2E 거래처" }).first();
  await expect(card).toBeVisible();
  await expect(card.getByText("777개")).toBeVisible();

  // 상태 변경 → 수주 전환 탭에서 보임
  await card.locator('select[name="status"]').selectOption("CONVERTED");
  await card.getByRole("button", { name: "상태 변경" }).click();
  await page.getByRole("link", { name: "수주 전환", exact: true }).click();
  const converted = page.locator("li", { hasText: "E2E 거래처" }).first();
  await expect(converted).toBeVisible();

  // 삭제 → 목록에서 사라짐 (소프트 삭제, 이력은 DB에 남음)
  await converted.getByRole("button", { name: "삭제" }).click();
  await expect(page.locator("li", { hasText: "E2E 거래처" })).toHaveCount(0);
});

test("헤더가 좁은 화면에서도 한 줄로 유지된다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/login");
  await page.getByLabel("아이디").fill("viewer");
  await page.getByLabel("비밀번호").fill(PW);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  const title = page.getByRole("link", { name: "출고·재고 보드" });
  const box = await title.boundingBox();
  expect(box?.height ?? 0).toBeLessThan(32); // 두 줄로 꺾이면 40px 이상
  for (const label of ["재고", "내 메모", "이력"]) {
    const b = await page.getByRole("link", { name: label, exact: true }).boundingBox();
    expect(b?.height ?? 0).toBeLessThan(48);
  }
});
