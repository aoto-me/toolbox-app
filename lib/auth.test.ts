import { describe, expect, it } from 'vitest';
import {
  type AttemptRecord,
  checkRateLimit,
  getIp,
  LOCK_DURATION_MS,
  recordFailedAttempt,
  validateCredentials,
} from './auth';

describe('validateCredentials', () => {
  it('emailが空なら null を返す', () => {
    expect(validateCredentials('', 'password')).toBeNull();
  });

  it('passwordが空なら null を返す', () => {
    expect(validateCredentials('test@example.com', '')).toBeNull();
  });

  it('emailが254文字超なら null を返す', () => {
    const longEmail = 'a'.repeat(255);
    expect(validateCredentials(longEmail, 'password')).toBeNull();
  });

  it('passwordが128文字超なら null を返す', () => {
    const longPassword = 'a'.repeat(129);
    expect(validateCredentials('test@example.com', longPassword)).toBeNull();
  });

  it('正常な入力なら email と password を返す', () => {
    expect(validateCredentials('test@example.com', 'password')).toEqual({
      email: 'test@example.com',
      password: 'password',
    });
  });
});

describe('checkRateLimit', () => {
  it('記録がなければ通過する', () => {
    const attempts = new Map<string, AttemptRecord>();
    expect(checkRateLimit(attempts, 'ip:127.0.0.1')).toEqual({
      blocked: false,
      resetKey: false,
    });
  });

  it('失敗回数が閾値未満ならば通過する', () => {
    const attempts = new Map<string, AttemptRecord>([
      ['ip:127.0.0.1', { count: 9, lockedUntil: null }],
    ]);
    expect(checkRateLimit(attempts, 'ip:127.0.0.1')).toEqual({
      blocked: false,
      resetKey: false,
    });
  });

  it('ロック中かつ期限内ならブロックする', () => {
    const now = 1000000;
    const attempts = new Map<string, AttemptRecord>([
      ['ip:127.0.0.1', { count: 10, lockedUntil: now + LOCK_DURATION_MS }],
    ]);
    expect(checkRateLimit(attempts, 'ip:127.0.0.1', now)).toEqual({
      blocked: true,
      resetKey: false,
    });
  });

  it('ロック期限切れなら通過し、リセットを指示する', () => {
    const now = 1000000;
    const attempts = new Map<string, AttemptRecord>([
      ['ip:127.0.0.1', { count: 10, lockedUntil: now - 1 }],
    ]);
    expect(checkRateLimit(attempts, 'ip:127.0.0.1', now)).toEqual({
      blocked: false,
      resetKey: true,
    });
  });
});

describe('recordFailedAttempt', () => {
  it('初回失敗で count が 1 になる', () => {
    const attempts = new Map<string, AttemptRecord>();
    recordFailedAttempt(attempts, 'ip:127.0.0.1');
    expect(attempts.get('ip:127.0.0.1')).toEqual({
      count: 1,
      lockedUntil: null,
    });
  });

  it('9回目の失敗ではロックされない', () => {
    const attempts = new Map<string, AttemptRecord>([
      ['ip:127.0.0.1', { count: 8, lockedUntil: null }],
    ]);
    recordFailedAttempt(attempts, 'ip:127.0.0.1');
    expect(attempts.get('ip:127.0.0.1')).toEqual({
      count: 9,
      lockedUntil: null,
    });
  });

  it('10回目の失敗でロック時刻が設定される', () => {
    const now = 1000000;
    const attempts = new Map<string, AttemptRecord>([
      ['ip:127.0.0.1', { count: 9, lockedUntil: null }],
    ]);
    recordFailedAttempt(attempts, 'ip:127.0.0.1', now);
    expect(attempts.get('ip:127.0.0.1')).toEqual({
      count: 10,
      lockedUntil: now + LOCK_DURATION_MS,
    });
  });
});

describe('getIp', () => {
  it('x-real-ip があれば x-forwarded-for より優先して返す', () => {
    const request = {
      headers: {
        get: (name: string) => {
          if (name === 'x-real-ip') return '9.8.7.6';
          if (name === 'x-forwarded-for') return '1.2.3.4, 5.6.7.8';
          return null;
        },
      },
    };
    expect(getIp(request)).toBe('9.8.7.6');
  });

  it('x-real-ip がなく x-forwarded-for があれば最初のIPを返す', () => {
    const request = {
      headers: {
        get: (name: string) => (name === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null),
      },
    };
    expect(getIp(request)).toBe('1.2.3.4');
  });

  it('どちらもなければ unknown を返す', () => {
    const request = {
      headers: {
        get: () => null,
      },
    };
    expect(getIp(request)).toBe('unknown');
  });
});
