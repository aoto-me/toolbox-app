import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { files } from '@/db/schema';
import {
  INVALID_REQUEST_MESSAGE,
  NOT_FOUND_MESSAGE,
  RATE_LIMIT_MESSAGE,
  UNAUTHORIZED_MESSAGE,
} from '@/lib/error-messages';
import { createRateLimitGuard } from '@/lib/rate-limit';
import { getPresignedGetUrl } from '@/lib/s3';
import { getUserId } from '@/lib/session';

const isRequestAllowed = createRateLimitGuard(10);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (userId === null) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  if (!isRequestAllowed(request)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { id } = await params;
  const fileId = Number(id);
  if (isNaN(fileId)) {
    return NextResponse.json({ error: INVALID_REQUEST_MESSAGE }, { status: 400 });
  }

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId)));

  if (!file) {
    return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
  }

  const url = await getPresignedGetUrl(file.s3Key, file.filename);
  return NextResponse.json({ url });
}
