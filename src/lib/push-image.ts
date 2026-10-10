export function pushImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  let url: URL;
  try { url = new URL(value); }
  catch { return undefined; }
  if (url.protocol !== 'https:' || url.username || url.password) return undefined;
  return url.href;
}
