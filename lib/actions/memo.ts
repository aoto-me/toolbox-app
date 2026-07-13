'use server';

import { db } from '@/db';
import { memos } from '@/db/schema';
import { UNAUTHORIZED_MESSAGE } from '@/lib/error-messages';
import { validateMemoContent } from '@/lib/memo';
import { getUserId } from '@/lib/session';

export async function saveMemo(content: string): Promise<{ updatedAt: string }> {
  const userId = await getUserId();
  if (userId === null) throw new Error(UNAUTHORIZED_MESSAGE);

  const contentError = validateMemoContent(content);
  if (contentError) throw new Error(contentError);

  const [updated] = await db
    .insert(memos)
    .values({ content, updatedAt: new Date(), userId })
    .onConflictDoUpdate({
      set: { content, updatedAt: new Date() },
      target: memos.userId,
    })
    .returning();

  return { updatedAt: updated.updatedAt.toISOString() };
}
