export const PULL_REFRESH_THRESHOLD = 72;
export const PULL_REFRESH_LIMIT = 96;

export function pullRefreshAllowed(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  return segments.length >= 2 && !segments.some((part) =>
    ['new', 'edit', 'profile', 'admin', 'login', 'register', 'onboarding'].includes(part)
  );
}

export function pullRefreshDistance(dx: number, dy: number): number {
  if (dy <= 0 || Math.abs(dx) > dy) return 0;
  return Math.min(PULL_REFRESH_LIMIT, dy * 0.5);
}
