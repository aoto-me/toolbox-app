import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_SIZE,
  parsePresignBody,
  sanitizeFilename,
  validateFileSize,
  validateS3KeyOwnership,
} from './file-upload';

describe('parsePresignBody', () => {
  it('正常なbodyをパースする', () => {
    expect(parsePresignBody({ filename: 'test.png', mimeType: 'image/png', size: 1024 })).toEqual({
      filename: 'test.png',
      mimeType: 'image/png',
      size: 1024,
    });
  });

  it('bodyがnullならnullを返す', () => {
    expect(parsePresignBody(null)).toBeNull();
  });

  it('filenameが欠けていればnullを返す', () => {
    expect(parsePresignBody({ mimeType: 'image/png', size: 1024 })).toBeNull();
  });

  it('sizeが文字列ならnullを返す', () => {
    expect(parsePresignBody({ filename: 'a.png', mimeType: 'image/png', size: '1024' })).toBeNull();
  });
});

describe('sanitizeFilename', () => {
  it('英数字とドット・ハイフン・アンダースコアはそのまま', () => {
    expect(sanitizeFilename('my-file_2024.png')).toBe('my-file_2024.png');
  });

  it('日本語文字をアンダースコアに置換する', () => {
    expect(sanitizeFilename('テスト画像.png')).toBe('_____.png');
  });

  it('スペースをアンダースコアに置換する', () => {
    expect(sanitizeFilename('my file name.pdf')).toBe('my_file_name.pdf');
  });

  it('特殊文字をアンダースコアに置換する', () => {
    expect(sanitizeFilename('file@#$%.txt')).toBe('file____.txt');
  });
});

describe('validateS3KeyOwnership', () => {
  it('正しいuserIdプレフィックスならtrueを返す', () => {
    expect(validateS3KeyOwnership('42/uuid-file.png', 42)).toBe(true);
  });

  it('異なるuserIdプレフィックスならfalseを返す', () => {
    expect(validateS3KeyOwnership('99/uuid-file.png', 42)).toBe(false);
  });

  it('プレフィックスがなければfalseを返す', () => {
    expect(validateS3KeyOwnership('uuid-file.png', 42)).toBe(false);
  });

  it('部分一致では通さない（42が420に一致しない）', () => {
    expect(validateS3KeyOwnership('420/uuid-file.png', 42)).toBe(false);
  });
});

describe('validateFileSize', () => {
  it('上限以内ならnullを返す', () => {
    expect(validateFileSize(1024)).toBeNull();
  });

  it('ちょうど上限ならnullを返す', () => {
    expect(validateFileSize(MAX_FILE_SIZE)).toBeNull();
  });

  it('上限超過ならエラーメッセージを返す', () => {
    expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe('ファイルサイズが上限（1GB）を超えています');
  });

  it('0バイトならnullを返す', () => {
    expect(validateFileSize(0)).toBeNull();
  });
});
