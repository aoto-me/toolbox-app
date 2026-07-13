import type { SimpleSupportStatement } from '@mdn/browser-compat-data';

export type BcdNode = Record<string, unknown>;
export type SupportValue = SimpleSupportStatement | SimpleSupportStatement[];

export function collectKeys(obj: BcdNode, prefix: string, results: string[]): void {
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__compat') {
      results.push(prefix.slice(0, -1));
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      collectKeys(value as BcdNode, `${prefix}${key}.`, results);
    }
  }
}

export function getCompatByKey(bcdData: BcdNode, key: string) {
  const parts = key.split('.');
  let node: unknown = bcdData;
  for (const part of parts) {
    if (node === null || typeof node !== 'object') return null;
    node = (node as BcdNode)[part];
  }
  if (!node || typeof node !== 'object') return null;
  return (node as BcdNode).__compat as
    undefined | { mdn_url?: string; support: Partial<Record<string, SupportValue>> };
}

export function getReleaseDate(
  releases: Record<string, { release_date?: string }> | undefined,
  version: string
): null | { month: number; year: number } {
  if (!releases) return null;
  const release = releases[version] ?? releases[version.split('.')[0]];
  if (!release?.release_date) return null;
  const d = new Date(release.release_date);
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

export function resolveVersionAdded(support: SupportValue): false | string {
  const stmt = Array.isArray(support) ? support[0] : support;
  return stmt.version_added;
}
