export const MAX_ATTEMPTS = 10;
export const LOCK_DURATION_MS = 30 * 60 * 1000; // 30分

export interface AttemptRecord {
  count: number;
  lockedUntil: null | number;
}

export interface RateLimitResult {
  blocked: boolean;
  resetKey: boolean;
}

export function checkRateLimit(
  attempts: Map<string, AttemptRecord>,
  key: string,
  now: number = Date.now()
): RateLimitResult {
  const record = attempts.get(key);
  if (!record?.lockedUntil) {
    return { blocked: false, resetKey: false };
  }
  if (now < record.lockedUntil) {
    return { blocked: true, resetKey: false };
  }
  return { blocked: false, resetKey: true };
}

export function getIp(request: { headers: { get(name: string): null | string } }): string {
  // x-forwarded-forはクライアントが任意の値を送り込めるため、Nginxが$remote_addrで
  // 上書きするx-real-ip（偽装不可）を優先する
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export function recordFailedAttempt(
  attempts: Map<string, AttemptRecord>,
  key: string,
  now: number = Date.now()
): void {
  const current = attempts.get(key) ?? { count: 0, lockedUntil: null };
  const newCount = current.count + 1;
  attempts.set(key, {
    count: newCount,
    lockedUntil: newCount >= MAX_ATTEMPTS ? now + LOCK_DURATION_MS : null,
  });
}

export function validateCredentials(
  email: unknown,
  password: unknown
): null | { email: string; password: string } {
  if (!email || !password) return null;
  const e = email as string;
  const p = password as string;
  if (typeof e !== 'string' || typeof p !== 'string') return null;
  if (e.length > 254 || p.length > 128) return null;
  return { email: e, password: p };
}
