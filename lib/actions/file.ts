'use server';

import { count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { files } from '@/db/schema';
import { FORBIDDEN_MESSAGE, MAX_FILES_MESSAGE, UNAUTHORIZED_MESSAGE } from '@/lib/error-messages';
import { MAX_FILES, validateS3KeyOwnership } from '@/lib/file-upload';
import { getUserId } from '@/lib/session';

export async function registerFile(params: {
  filename: string;
  mimeType: string;
  s3Key: string;
  size: number;
}): Promise<{ createdAt: string; filename: string; id: number; mimeType: string; size: number }> {
  const userId = await getUserId();
  if (userId === null) throw new Error(UNAUTHORIZED_MESSAGE);

  if (!validateS3KeyOwnership(params.s3Key, userId)) {
    throw new Error(FORBIDDEN_MESSAGE);
  }

  const [{ value: fileCount }] = await db
    .select({ value: count() })
    .from(files)
    .where(eq(files.userId, userId));

  if (fileCount >= MAX_FILES) {
    throw new Error(MAX_FILES_MESSAGE);
  }

  const [newFile] = await db
    .insert(files)
    .values({
      filename: params.filename,
      mimeType: params.mimeType,
      s3Key: params.s3Key,
      size: params.size,
      userId,
    })
    .returning();

  return {
    createdAt: newFile.createdAt.toISOString(),
    filename: newFile.filename,
    id: newFile.id,
    mimeType: newFile.mimeType,
    size: newFile.size,
  };
}
