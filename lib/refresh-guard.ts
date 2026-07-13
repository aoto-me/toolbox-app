const blockers = new Set<string>();

export function isRefreshBlocked(): boolean {
  return blockers.size > 0;
}

export function setRefreshBlocked(key: string, blocked: boolean): void {
  if (blocked) blockers.add(key);
  else blockers.delete(key);
}
