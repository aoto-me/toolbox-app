import { describe, expect, it } from 'vitest';
import { createSaveSequence } from './save-sequence';

describe('createSaveSequence', () => {
  it('startを1度も呼んでいなければ、どのIDも最新扱いされない', () => {
    const seq = createSaveSequence();
    expect(seq.isLatest(1)).toBe(false);
  });

  it('startを1度も呼んでいなければ、isLatest(0)もfalseを返す', () => {
    const seq = createSaveSequence();
    expect(seq.isLatest(0)).toBe(false);
  });

  it('startが1回だけなら、そのIDが最新として扱われる', () => {
    const seq = createSaveSequence();
    const id = seq.start();
    expect(seq.isLatest(id)).toBe(true);
  });

  it('後から発行したIDだけが最新として扱われる', () => {
    const seq = createSaveSequence();
    const first = seq.start();
    const second = seq.start();

    expect(seq.isLatest(first)).toBe(false);
    expect(seq.isLatest(second)).toBe(true);
  });

  it('先に発行したIDの応答が、後発IDの完了より後に返ってきても最新扱いされない', () => {
    const seq = createSaveSequence();
    const first = seq.start();
    const second = seq.start();

    // secondが先に完了したとしても、isLatestの判定はstartした順序のみで決まる
    expect(seq.isLatest(second)).toBe(true);
    expect(seq.isLatest(first)).toBe(false);
  });
});
