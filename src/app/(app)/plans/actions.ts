"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { canEdit, getSessionUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/format";

type Result = { ok: true } | { ok: false; error: string };

/** FR-16 생산 계획 등록 (생산지원팀) */
export async function addPlan(_prev: Result | undefined, formData: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!canEdit(user)) return { ok: false, error: "생산 계획 입력 권한이 없습니다." };
  const itemCode = String(formData.get("itemCode") ?? "").trim().toUpperCase();
  const siteCode = String(formData.get("siteCode") ?? "");
  const plannedQty = Number(formData.get("plannedQty"));
  const startDate = String(formData.get("startDate") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const stageCode = String(formData.get("stageCode") ?? "PLANNED");
  const memo = String(formData.get("memo") ?? "").trim() || null;

  const item = await prisma.item.findUnique({ where: { code: itemCode } });
  if (!item) return { ok: false, error: `품번 ${itemCode}을(를) 찾을 수 없습니다.` };
  if (!Number.isInteger(plannedQty) || plannedQty <= 0) return { ok: false, error: "계획 수량을 입력하세요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, error: "완료 예정일을 선택하세요." };

  await prisma.productionPlan.create({
    data: {
      itemCode,
      siteCode,
      plannedQty,
      startDate: startDate ? parseDateOnly(startDate) : null,
      dueDate: parseDateOnly(dueDate),
      stageCode,
      memo,
      createdById: user!.id,
      updatedById: user!.id,
    },
  });
  revalidatePath("/plans");
  revalidatePath(`/items/${encodeURIComponent(itemCode)}`);
  revalidatePath("/");
  return { ok: true };
}

/** FR-15/16 공정 단계 변경: 마지막 변경 시각과 변경자를 기록 */
export async function changeStage(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!canEdit(user)) return;
  const id = String(formData.get("id") ?? "");
  const stageCode = String(formData.get("stageCode") ?? "");
  const plan = await prisma.productionPlan.findUnique({ where: { id } });
  if (!plan || plan.stageCode === stageCode) return;
  await prisma.productionPlan.update({
    where: { id },
    data: { stageCode, stageChangedAt: new Date(), updatedById: user!.id },
  });
  revalidatePath("/plans");
  revalidatePath(`/items/${encodeURIComponent(plan.itemCode)}`);
  revalidatePath("/");
}
