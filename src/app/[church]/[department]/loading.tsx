// 대시보드 로딩 스켈레톤
// loading.tsx는 자동으로 Suspense 경계를 생성 → 레이아웃(헤더/사이드바)은 즉시 렌더링되고
// 페이지 데이터가 로드되는 동안 이 스켈레톤을 표시합니다
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome card skeleton */}
      <div className="rounded-2xl bg-primary-200 h-24" />

      {/* Quick links skeleton */}
      <div>
        <div className="h-4 w-16 bg-stone-200 rounded mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-stone-100 h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
