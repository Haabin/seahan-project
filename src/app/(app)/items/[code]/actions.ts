"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { canEdit, getSessionUser } from "@/lib/auth";
import { ADJUSTMENT_TYPES, type AdjustmentTypeCode } from "@/lib/domain/availableQty";
import { parseDateOnly } from "@/lib/format";

type Result = { ok: true } | { ok: false; error: string };

/** FR-07 변동 입력: 저장 즉시 출고 가능 수량에 반영 */
export async function addAdjustment(_prev: Result | undefined, formData: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!canEdit(user)) return { ok: false, error: "변동 입력 권한이 없습니다. (생산지원팀·관리자만)" };

  const itemCode = String(formData.get("itemCode") ?? "");
  const siteCode = String(formData.get("siteCode") ?? "");
  const type = String(formData.get("type") ?? "") as AdjustmentTypeCode;
  const qty = Number(formData.get("qty"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!ADJUSTMENT_TYPES.includes(type)) return { ok: false, error: "유형을 선택하세요." };
  if (!Number.isInteger(qty) || qty <= 0) return { ok: false, error: "수량은 1 이상의 정수여야 합니다." };
  if (!reason) return { ok: false, error: "사유를 입력하세요." };
  if (!siteCode) return { ok: false, error: "사업장을 선택하세요." };

  await prisma.adjustment.create({
    data: { itemCode, siteCode, type, qty, reason, createdById: user!.id },
  });
  revalidatePath(`/items/${encodeURIComponent(itemCode)}`);
  revalidatePath("/");
  return { ok: true };
}

/** FR-08 변동 해제: 계산에서 빠지고 기록은 남는다 */
export async function releaseAdjustment(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!canEdit(user)) return;
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const adj = await prisma.adjustment.findUnique({ where: { id } });
  if (!adj || adj.status !== "ACTIVE") return; // 이미 해제된 것은 다시 처리하지 않음 (이중 처리 방지)
  await prisma.adjustment.update({
    where: { id },
    data: { status: "RELEASED", releasedById: user!.id, releasedAt: new Date(), releaseNote: note },
  });
  revalidatePath(`/items/${encodeURIComponent(adj.itemCode)}`);
  revalidatePath("/");
}

/** FR-17 상담 메모 (영업사원, 1분 안에 입력) */
export async function addConsultNote(_prev: Result | undefined, formData: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const itemCode = String(formData.get("itemCode") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const requestedQty = Number(formData.get("requestedQty"));
  const desiredDate = String(formData.get("desiredDate") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!customerName) return { ok: false, error: "고객명을 입력하세요." };
  if (!Number.isInteger(requestedQty) || requestedQty <= 0) return { ok: false, error: "요청 수량을 입력하세요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desiredDate)) return { ok: false, error: "희망 납기를 선택하세요." };

  const data = { itemCode, customerName, requestedQty, desiredDate: parseDateOnly(desiredDate), content, authorId: user.id };
  const note = await prisma.consultNote.create({ data });
  await prisma.consultNoteHistory.create({ data: { noteId: note.id, action: "CREATE", snapshot: data, actorId: user.id } });
  revalidatePath(`/items/${encodeURIComponent(itemCode)}`);
  return { ok: true };
}
