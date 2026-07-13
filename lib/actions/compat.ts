'use server';

import type { BrowserName } from '@mdn/browser-compat-data';
import bcd from '@mdn/browser-compat-data';
import {
  type BcdNode,
  collectKeys,
  getCompatByKey,
  getReleaseDate,
  resolveVersionAdded,
} from '@/lib/compat';
import { NOT_FOUND_MESSAGE } from '@/lib/error-messages';

const SKIP_TOP_LEVEL = new Set(['__meta', 'browsers']);

const CATEGORY_LABEL: Record<string, string> = {
  api: 'API',
  css: 'CSS',
  html: 'HTML',
  http: 'HTTP',
  javascript: 'JS',
  manifests: 'Manifest',
  mathml: 'MathML',
  mediatypes: 'Media',
  svg: 'SVG',
  webassembly: 'WASM',
  webdriver: 'WebDriver',
  webextensions: 'Extension',
};

const BROWSERS: { id: BrowserName; name: string }[] = [
  { id: 'chrome', name: 'Chrome' },
  { id: 'safari', name: 'Safari' },
  { id: 'firefox', name: 'Firefox' },
  { id: 'safari_ios', name: 'iOS Safari' },
  { id: 'chrome_android', name: 'Chrome Android' },
];

const IOS_TO_IPHONE: Record<string, string> = {
  '1': 'iPhone（初代）',
  '2': 'iPhone 3G以降',
  '3': 'iPhone 3G以降',
  '4': 'iPhone 3G以降',
  '5': 'iPhone 3GS以降',
  '6': 'iPhone 3GS以降',
  '7': 'iPhone 4以降',
  '8': 'iPhone 4s以降',
  '9': 'iPhone 4s以降',
  '10': 'iPhone 5以降',
  '11': 'iPhone 5s以降',
  '12': 'iPhone 5s以降',
  '13': 'iPhone 6s以降',
  '14': 'iPhone 6s以降',
  '15': 'iPhone 6s以降',
  '16': 'iPhone 8以降',
  '17': 'iPhone XS以降',
  '18': 'iPhone XS以降',
  '26': 'iPhone 11以降',
};

const ALL_KEYS: string[] = [];
for (const [category, data] of Object.entries(bcd)) {
  if (SKIP_TOP_LEVEL.has(category)) continue;
  if (data !== null && typeof data === 'object') {
    collectKeys(data as BcdNode, `${category}.`, ALL_KEYS);
  }
}

export interface BrowserResult {
  id: string;
  iphoneLabel: null | string;
  name: string;
  supported: boolean | null;
  text: string;
}

export interface CompatDetail {
  browsers: BrowserResult[];
  key: string;
  mdnUrl: null | string;
}

export interface CompatSuggestion {
  category: string;
  key: string;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function getCompatDetail(key: string): Promise<CompatDetail> {
  const compat = getCompatByKey(bcd as unknown as BcdNode, key);
  if (!compat) throw new Error(NOT_FOUND_MESSAGE);

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  const browsers = BROWSERS.map(({ id, name }) => {
    const raw = compat.support[id];
    if (!raw) {
      return {
        id,
        iphoneLabel: null as null | string,
        name,
        supported: null as boolean | null,
        text: '不明',
      };
    }

    const version = resolveVersionAdded(raw);
    if (version === false) {
      return { id, iphoneLabel: null, name, supported: false, text: '未対応' };
    }

    const releases = bcd.browsers[id]?.releases as
      Record<string, { release_date?: string }> | undefined;
    const date = getReleaseDate(releases, version);
    const monthsAgo = date ? (currentYear - date.year) * 12 + (currentMonth - date.month) : null;
    const yearsAgo = monthsAgo !== null ? Math.floor(monthsAgo / 12) : null;
    const text = date ? `${date.year}年${date.month}月〜（約${yearsAgo}年前）` : `v${version}〜`;
    const iphoneLabel = id === 'safari_ios' ? (IOS_TO_IPHONE[version.split('.')[0]] ?? null) : null;

    return { id, iphoneLabel, name, supported: true, text };
  });

  return { browsers, key, mdnUrl: compat.mdn_url ?? null };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function searchCompat(query: string): Promise<{ suggestions: CompatSuggestion[] }> {
  const lower = query.toLowerCase();
  const suggestions = ALL_KEYS.filter((k) => k.toLowerCase().includes(lower))
    .slice(0, 30)
    .map((k) => {
      const category = k.split('.')[0];
      const label = CATEGORY_LABEL[category] ?? category;
      return { category: label, key: k };
    });
  return { suggestions };
}
