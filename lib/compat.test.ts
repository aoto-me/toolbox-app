import { describe, expect, it } from 'vitest';
import type { BcdNode, SupportValue } from './compat';
import { collectKeys, getCompatByKey, getReleaseDate, resolveVersionAdded } from './compat';

describe('collectKeys', () => {
  it('__compatを持つノードのキーを収集する', () => {
    const obj: BcdNode = {
      properties: {
        display: { __compat: {} },
        flex: { __compat: {} },
      },
    };
    const results: string[] = [];
    collectKeys(obj, 'css.', results);
    expect(results).toEqual(['css.properties.display', 'css.properties.flex']);
  });

  it('ネストされた構造を再帰的にたどる', () => {
    const obj: BcdNode = {
      Promise: {
        __compat: {},
        all: { __compat: {} },
      },
    };
    const results: string[] = [];
    collectKeys(obj, 'javascript.builtins.', results);
    expect(results).toContain('javascript.builtins.Promise');
    expect(results).toContain('javascript.builtins.Promise.all');
  });

  it('__compat以外のプリミティブ値はスキップする', () => {
    const obj: BcdNode = {
      description: 'some text',
      status: { __compat: {} },
    };
    const results: string[] = [];
    collectKeys(obj, 'api.', results);
    expect(results).toEqual(['api.status']);
  });

  it('配列値はスキップする', () => {
    const obj: BcdNode = {
      items: [1, 2, 3],
      valid: { __compat: {} },
    };
    const results: string[] = [];
    collectKeys(obj, 'test.', results);
    expect(results).toEqual(['test.valid']);
  });
});

describe('resolveVersionAdded', () => {
  it('単一のstatementからバージョンを取得する', () => {
    const support = { version_added: '60' } as SupportValue;
    expect(resolveVersionAdded(support)).toBe('60');
  });

  it('配列の場合は最初の要素のバージョンを取得する', () => {
    const support = [{ version_added: '60' }, { version_added: '55' }] as SupportValue;
    expect(resolveVersionAdded(support)).toBe('60');
  });

  it('未対応（false）を返す', () => {
    const support = { version_added: false } as SupportValue;
    expect(resolveVersionAdded(support)).toBe(false);
  });
});

describe('getReleaseDate', () => {
  it('リリース日がある場合、年月を返す', () => {
    const releases = { '60': { release_date: '2018-05-09' } };
    expect(getReleaseDate(releases, '60')).toEqual({ month: 5, year: 2018 });
  });

  it('メジャーバージョンにフォールバックする', () => {
    const releases = { '14': { release_date: '2020-09-16' } };
    expect(getReleaseDate(releases, '14.0')).toEqual({ month: 9, year: 2020 });
  });

  it('releasesがundefinedならnullを返す', () => {
    expect(getReleaseDate(undefined, '60')).toBeNull();
  });

  it('該当バージョンがなければnullを返す', () => {
    const releases = { '60': { release_date: '2018-05-09' } };
    expect(getReleaseDate(releases, '99')).toBeNull();
  });

  it('release_dateがなければnullを返す', () => {
    const releases = { '60': {} };
    expect(getReleaseDate(releases, '60')).toBeNull();
  });
});

describe('getCompatByKey', () => {
  it('ドット区切りのキーで__compatを取得する', () => {
    const bcd: BcdNode = {
      css: {
        properties: {
          display: {
            __compat: { support: { chrome: { version_added: '1' } } },
          },
        },
      },
    };
    const result = getCompatByKey(bcd, 'css.properties.display');
    expect(result).toEqual({ support: { chrome: { version_added: '1' } } });
  });

  it('存在しないキーはnullを返す', () => {
    const bcd: BcdNode = { css: {} };
    expect(getCompatByKey(bcd, 'css.properties.nonexistent')).toBeNull();
  });

  it('__compatがないノードはundefinedを返す', () => {
    const bcd: BcdNode = { css: { properties: {} } };
    expect(getCompatByKey(bcd, 'css.properties')).toBeUndefined();
  });

  it('中間ノードがプリミティブならnullを返す', () => {
    const bcd: BcdNode = { css: 'not an object' };
    expect(getCompatByKey(bcd, 'css.properties.display')).toBeNull();
  });
});
