export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export function parsePresignBody(
  body: unknown
): null | { filename: string; mimeType: string; size: number } {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (
    typeof b.filename !== 'string' ||
    typeof b.mimeType !== 'string' ||
    typeof b.size !== 'number'
  )
    return null;
  return { filename: b.filename, mimeType: b.mimeType, size: b.size };
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function validateFileSize(size: number): null | string {
  if (size > MAX_FILE_SIZE) return 'ファイルサイズが上限（1GB）を超えています';
  return null;
}

export function validateS3KeyOwnership(s3Key: string, userId: number): boolean {
  return s3Key.startsWith(`${userId}/`);
}
