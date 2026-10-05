export function notificationPreview(body: string | null | undefined, limit = 140): string {
  const text = (body || '').replace(/\s+/g, ' ').trim();
  const characters = Array.from(text);
  return characters.length > limit ? `${characters.slice(0, limit - 1).join('')}…` : text;
}
