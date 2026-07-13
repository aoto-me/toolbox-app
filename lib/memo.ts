export const MEMO_MAX_LENGTH = 1000;

export function validateMemoContent(content: string): null | string {
  if (content.length > MEMO_MAX_LENGTH) return '文字数が上限を超えています';
  return null;
}
