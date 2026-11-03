"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** FR-11 즐겨찾기 토글: 사용자별로 저장되고 목록 위에 고정된다 */
export async function toggleFavorite(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const itemCode = String(formData.get("itemCode") ?? "");
  const key = { userId_itemCode: { userId: user.id, itemCode } };
  const existing = await prisma.favorite.findUnique({ where: key });
  if (existing) await prisma.favorite.delete({ where: key });
  else await prisma.favorite.create({ data: { userId: user.id, itemCode } });
  revalidatePath("/");
}
