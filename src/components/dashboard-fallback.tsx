'use client';

import { SWRConfig } from 'swr';

/**
 * 서버에서 미리 조회한 데이터를 SWR 캐시에 주입하는 클라이언트 래퍼.
 * 하위 클라이언트 컴포넌트(WorshipGuide, GatheringBoard)는 마운트 즉시
 * fallback 데이터로 렌더되고, 이후 백그라운드에서 최신값을 재검증한다.
 * → 대시보드 진입 시 스켈레톤 없이 콘텐츠가 바로 표시된다.
 */
export function DashboardFallback({
  fallback,
  children,
}: {
  fallback: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
