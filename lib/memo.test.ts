import { describe, expect, it } from 'vitest';
import { MEMO_MAX_LENGTH, validateMemoContent } from './memo';

describe('validateMemoContent', () => {
  it('上限以内ならnullを返す', () => {
    expect(validateMemoContent('テスト')).toBeNull();
  });

  it('ちょうど上限ならnullを返す', () => {
    expect(validateMemoContent('a'.repeat(MEMO_MAX_LENGTH))).toBeNull();
  });

  it('上限超過ならエラーメッセージを返す', () => {
    expect(validateMemoContent('a'.repeat(MEMO_MAX_LENGTH + 1))).toBe('文字数が上限を超えています');
  });
});
