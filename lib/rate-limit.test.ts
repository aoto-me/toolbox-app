import { describe, expect, it } from 'vitest';
import { consumeRateLimit, createRateLimitGuard, type RateLimitRecord } from './rate-limit';

function fakeRequest(ip: string) {
  return { headers: { get: (name: string) => (name === 'x-real-ip' ? ip : null) } };
}

describe('createRateLimitGuard', () => {
  it('上限回数までは許可される', () => {
    const isAllowed = createRateLimitGuard(2);
    expect(isAllowed(fakeRequest('1.2.3.4'))).toBe(true);
    expect(isAllowed(fakeRequest('1.2.3.4'))).toBe(true);
  });

  it('上限回数を超えると拒否される', () => {
    const isAllowed = createRateLimitGuard(2);
    isAllowed(fakeRequest('1.2.3.4'));
    isAllowed(fakeRequest('1.2.3.4'));
    expect(isAllowed(fakeRequest('1.2.3.4'))).toBe(false);
  });

  it('異なるIPは独立してカウントされる', () => {
    const isAllowed = createRateLimitGuard(1);
    isAllowed(fakeRequest('1.2.3.4'));
    expect(isAllowed(fakeRequest('1.2.3.4'))).toBe(false);
    expect(isAllowed(fakeRequest('5.6.7.8'))).toBe(true);
  });
});

describe('consumeRateLimit', () => {
  it('初回リクエストは許可される', () => {
    const attempts = new Map<string, RateLimitRecord>();
    expect(consumeRateLimit(attempts, 'ip:1', 3, 0)).toBe(true);
  });

  it('上限に達するまでは許可される', () => {
    const attempts = new Map<string, RateLimitRecord>();
    expect(consumeRateLimit(attempts, 'ip:1', 3, 0)).toBe(true);
    expect(consumeRateLimit(attempts, 'ip:1', 3, 1000)).toBe(true);
    expect(consumeRateLimit(attempts, 'ip:1', 3, 2000)).toBe(true);
  });

  it('上限に達すると拒否される', () => {
    const attempts = new Map<string, RateLimitRecord>();
    consumeRateLimit(attempts, 'ip:1', 3, 0);
    consumeRateLimit(attempts, 'ip:1', 3, 1000);
    consumeRateLimit(attempts, 'ip:1', 3, 2000);
    expect(consumeRateLimit(attempts, 'ip:1', 3, 3000)).toBe(false);
  });

  it('ウィンドウ経過後はカウントがリセットされる', () => {
    const attempts = new Map<string, RateLimitRecord>();
    consumeRateLimit(attempts, 'ip:1', 3, 0);
    consumeRateLimit(attempts, 'ip:1', 3, 1000);
    consumeRateLimit(attempts, 'ip:1', 3, 2000);
    expect(consumeRateLimit(attempts, 'ip:1', 3, 2000 + 60 * 1000)).toBe(true);
  });

  it('異なるキーは独立してカウントされる', () => {
    const attempts = new Map<string, RateLimitRecord>();
    consumeRateLimit(attempts, 'ip:1', 1, 0);
    expect(consumeRateLimit(attempts, 'ip:1', 1, 0)).toBe(false);
    expect(consumeRateLimit(attempts, 'ip:2', 1, 0)).toBe(true);
  });
});
