import { count, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { files } from '@/db/schema';
import {
  INVALID_REQUEST_MESSAGE,
  MAX_FILES_MESSAGE,
  RATE_LIMIT_MESSAGE,
  UNAUTHORIZED_MESSAGE,
} from '@/lib/error-messages';
import { validateFile } from '@/lib/file-types';
import { MAX_FILES, parsePresignBody, sanitizeFilename, validateFileSize } from '@/lib/file-upload';
import { createRateLimitGuard } from '@/lib/rate-limit';
import { getPresignedPutUrl } from '@/lib/s3';
import { getUserId } from '@/lib/session';

const isRequestAllowed = createRateLimitGuard(10);

export async function POST(request: Request) {
  const userId = await getUserId();
  if (userId === null) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  if (!isRequestAllowed(request)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const body: unknown = await request.json();
  const parsed = parsePresignBody(body);
  if (!parsed) {
    return NextResponse.json({ error: INVALID_REQUEST_MESSAGE }, { status: 400 });
  }

  const validationError = validateFile(parsed.filename, parsed.mimeType);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const sizeError = validateFileSize(parsed.size);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 400 });
  }

  const [{ value: fileCount }] = await db
    .select({ value: count() })
    .from(files)
    .where(eq(files.userId, userId));

  if (fileCount >= MAX_FILES) {
    return NextResponse.json({ error: MAX_FILES_MESSAGE }, { status: 400 });
  }

  const uuid = crypto.randomUUID();
  const safeFilename = sanitizeFilename(parsed.filename);
  const key = `${userId}/${uuid}-${safeFilename}`;

  const url = await getPresignedPutUrl(key, parsed.mimeType);
  return NextResponse.json({ key, url });
}
