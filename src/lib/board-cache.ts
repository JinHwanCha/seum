import type { Post, SessionPayload } from '@/lib/types';

export const BOARD_CACHE_TTL = 5 * 60 * 1000;
export const BOARD_CHANGED_EVENT = 'seum-board-changed';

export interface BoardPayload {
  posts: Post[];
  hasMore: boolean;
  villages: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  villageMap: Record<string, string>;
}

export interface CachedBoardPayload extends BoardPayload { fetchedAt: number }

export function boardCacheKey(session: SessionPayload, type: string): readonly string[] {
  return ['seum-board-v1', session.userId, session.churchId, session.departmentId,
    session.role, session.villageId || '', String(session.exp || ''),
    `/api/posts?boardType=${encodeURIComponent(type)}&includeMeta=1`];
}

export function boardCacheUsable(data: CachedBoardPayload | undefined, now = Date.now()): boolean {
  return Boolean(data && Number.isFinite(data.fetchedAt) && data.fetchedAt > 0 &&
    now >= data.fetchedAt && now - data.fetchedAt < BOARD_CACHE_TTL);
}

export function notifyBoardChanged() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(BOARD_CHANGED_EVENT));
  }
}

const pendingBoardRequests = new Map<string, Promise<CachedBoardPayload>>();

export function fetchBoard(key: readonly string[]): Promise<CachedBoardPayload> {
  const scope = JSON.stringify(key);
  const pending = pendingBoardRequests.get(scope);
  if (pending) return pending;
  const request = requestBoard(key).finally(() => pendingBoardRequests.delete(scope));
  pendingBoardRequests.set(scope, request);
  return request;
}

async function requestBoard(key: readonly string[]): Promise<CachedBoardPayload> {
  const response = await fetch(key[key.length - 1], { cache: 'no-store' });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('게시판에 연결하지 못했습니다. 로그인 상태를 확인해주세요.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : '게시판 조회에 실패했습니다.');
  if (!Array.isArray(data.posts) || !Array.isArray(data.villages) || !Array.isArray(data.categories) ||
      typeof data.hasMore !== 'boolean' || typeof data.villageMap !== 'object' || data.villageMap === null) {
    throw new Error('게시판 서버 응답이 올바르지 않습니다.');
  }
  return { ...data, fetchedAt: Date.now() };
}
