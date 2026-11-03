"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const STATUSES = ["OPEN", "CONVERTED", "CLOSED"] as const;
type Status = (typeof STATUSES)[number];

function snapshotOf(n: { itemCode: string; customerName: string; requestedQty: number; desiredDate: Date; content: string; status: string }) {
  return {
    itemCode: n.itemCode,
    customerName: n.customerName,
    requestedQty: n.requestedQty,
    desiredDate: n.desiredDate.toISOString(),
    content: n.content,
    status: n.status,
  };
}

function revalidate(itemCode: string) {
  revalidatePath("/notes");
  revalidatePath("/plans");
  revalidatePath(`/items/${encodeURIComponent(itemCode)}`);
}

/** 상담 메모 상태 변경 (작성자 본인 또는 관리자). 변경 전 내용을 이력에 남긴다 (NFR-09) */
export async function changeNoteStatus(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;
  if (!STATUSES.includes(status)) return;
  const note = await prisma.consultNote.findUnique({ where: { id } });
  if (!note || note.deletedAt || (note.authorId !== user.id && user.role !== "ADMIN")) return;
  if (note.status === status) return;
  await prisma.$transaction([
    prisma.consultNoteHistory.create({ data: { noteId: id, action: "UPDATE", snapshot: snapshotOf(note), actorId: user.id } }),
    prisma.consultNote.update({ where: { id }, data: { status } }),
  ]);
  revalidate(note.itemCode);
}

/** 상담 메모 삭제: 소프트 삭제 + 이력 (NFR-09) */
export async function deleteNote(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  const note = await prisma.consultNote.findUnique({ where: { id } });
  if (!note || note.deletedAt || (note.authorId !== user.id && user.role !== "ADMIN")) return;
  await prisma.$transaction([
    prisma.consultNoteHistory.create({ data: { noteId: id, action: "DELETE", snapshot: snapshotOf(note), actorId: user.id } }),
    prisma.consultNote.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
  revalidate(note.itemCode);
}
