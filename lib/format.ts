export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatUpdatedAt(dateStr: string, now: number = Date.now()): string {
  const diff = Math.floor((now - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'たった今保存';
  if (diff < 3600) return `${Math.floor(diff / 60)}分前に保存`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前に保存`;
  return `${Math.floor(diff / 86400)}日前に保存`;
}
