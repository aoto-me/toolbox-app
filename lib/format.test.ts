import { describe, expect, it } from 'vitest';
import { formatSize, formatUpdatedAt } from './format';

describe('formatSize', () => {
  it('1024未満はB表示', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(1023)).toBe('1023 B');
  });

  it('1024以上1MB未満はKB表示', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
  });

  it('1MB以上1GB未満はMB表示', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatSize(1024 * 1024 * 5.5)).toBe('5.5 MB');
  });

  it('1GB以上はGB表示', () => {
    expect(formatSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    expect(formatSize(1024 * 1024 * 1024 * 2.3)).toBe('2.3 GB');
  });
});

describe('formatUpdatedAt', () => {
  const base = new Date('2026-06-24T12:00:00Z').getTime();

  it('60秒未満なら「たった今保存」を返す', () => {
    expect(formatUpdatedAt('2026-06-24T12:00:00Z', base + 30 * 1000)).toBe('たった今保存');
    expect(formatUpdatedAt('2026-06-24T12:00:00Z', base + 59 * 1000)).toBe('たった今保存');
  });

  it('60秒以上1時間未満なら「○分前に保存」を返す', () => {
    expect(formatUpdatedAt('2026-06-24T12:00:00Z', base + 60 * 1000)).toBe('1分前に保存');
    expect(formatUpdatedAt('2026-06-24T12:00:00Z', base + 30 * 60 * 1000)).toBe('30分前に保存');
  });

  it('1時間以上24時間未満なら「○時間前に保存」を返す', () => {
    expect(formatUpdatedAt('2026-06-24T12:00:00Z', base + 3600 * 1000)).toBe('1時間前に保存');
    expect(formatUpdatedAt('2026-06-24T12:00:00Z', base + 5 * 3600 * 1000)).toBe('5時間前に保存');
  });

  it('24時間以上なら「○日前に保存」を返す', () => {
    expect(formatUpdatedAt('2026-06-24T12:00:00Z', base + 86400 * 1000)).toBe('1日前に保存');
    expect(formatUpdatedAt('2026-06-24T12:00:00Z', base + 3 * 86400 * 1000)).toBe('3日前に保存');
  });
});
