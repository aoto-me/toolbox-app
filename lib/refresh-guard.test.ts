import { describe, expect, it } from 'vitest';
import { isRefreshBlocked, setRefreshBlocked } from './refresh-guard';

describe('setRefreshBlocked / isRefreshBlocked', () => {
  it('初期状態ではブロックされていない', () => {
    expect(isRefreshBlocked()).toBe(false);
  });

  it('キーを登録するとブロック状態になる', () => {
    setRefreshBlocked('test-a', true);
    expect(isRefreshBlocked()).toBe(true);
    setRefreshBlocked('test-a', false);
  });

  it('キーを解除するとブロックが解除される', () => {
    setRefreshBlocked('test-b', true);
    setRefreshBlocked('test-b', false);
    expect(isRefreshBlocked()).toBe(false);
  });

  it('複数キーがある場合、すべて解除しないとブロックが残る', () => {
    setRefreshBlocked('test-c1', true);
    setRefreshBlocked('test-c2', true);
    setRefreshBlocked('test-c1', false);
    expect(isRefreshBlocked()).toBe(true);
    setRefreshBlocked('test-c2', false);
    expect(isRefreshBlocked()).toBe(false);
  });

  it('同じキーを二重登録しても一度の解除で消える', () => {
    setRefreshBlocked('test-d', true);
    setRefreshBlocked('test-d', true);
    setRefreshBlocked('test-d', false);
    expect(isRefreshBlocked()).toBe(false);
  });
});
