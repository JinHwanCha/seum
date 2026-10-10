import type { SessionPayload } from '@/lib/types';

export function smallGroupCacheKey(session: SessionPayload, url: string, assignment = ''): readonly string[] {
  return ['seum-small-group-v1', session.userId, session.churchId, session.departmentId,
    session.role, session.cellId || '', session.villageId || '', String(session.exp || ''), assignment, url];
}

const pendingRequests = new Map<string, ReturnType<typeof requestSmallGroup>>();

export function fetchSmallGroup(key: readonly string[]) {
  const scope = JSON.stringify(key);
  const existing = pendingRequests.get(scope);
  if (existing) return existing;
  const request = requestSmallGroup(key).finally(() => pendingRequests.delete(scope));
  pendingRequests.set(scope, request);
  return request;
}

async function requestSmallGroup(key: readonly string[]) {
  const response = await fetch(key[key.length - 1], { cache: 'no-store' });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('소그룹 서버 연결과 로그인 상태를 확인해주세요.');
  const data = await response.json();
  if (!data || typeof data !== 'object') throw new Error('소그룹 서버 응답이 올바르지 않습니다.');
  if (!response.ok) throw new Error(data.error || '소그룹 조회에 실패했습니다.');
  return data;
}
