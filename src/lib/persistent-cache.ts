export interface StoredCacheEntry {
  key: string;
  data: unknown;
  originalKey?: unknown;
}

export function readStoredCache(raw: string | null): StoredCacheEntry[] {
  if (!raw) return [];
  const entries: unknown = JSON.parse(raw);
  if (!Array.isArray(entries)) throw new Error('Stored cache must be an array.');
  return entries.flatMap((entry): StoredCacheEntry[] => {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' ||
        typeof entry[1] !== 'object' || entry[1] === null || !('data' in entry[1]) ||
        entry[1].data === undefined) return [];
    return [{ key: entry[0], data: entry[1].data, originalKey: entry[1]._k }];
  });
}
