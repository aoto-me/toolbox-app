import { getIp } from './auth';

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export interface RateLimitRecord {
  count: number;
  windowStart: number;
}

// 固定ウィンドウ方式でリクエストを許可するか判定し、許可した場合はカウントを1つ進める
export function consumeRateLimit(
  attempts: Map<string, RateLimitRecord>,
  key: string,
  limit: number,
  now: number = Date.now()
): boolean {
  const record = attempts.get(key);
  if (!record || now - record.windowStart >= RATE_LIMIT_WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

// IPアドレスをキーに、エンドポイント専用のレート制限器を作る
export function createRateLimitGuard(limit: number) {
  const attempts = new Map<string, RateLimitRecord>();
  return (request: { headers: { get(name: string): null | string } }): boolean =>
    consumeRateLimit(attempts, getIp(request), limit);
}
