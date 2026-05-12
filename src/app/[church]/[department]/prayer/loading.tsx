// 소그룹/기도 페이지 로딩 스켈레톤
export default function PrayerLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 주간 선택기 */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 bg-stone-200 rounded-lg" />
        <div className="h-5 w-32 bg-stone-200 rounded" />
        <div className="h-8 w-8 bg-stone-200 rounded-lg" />
      </div>

      {/* 출석 체크 */}
      <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3">
        <div className="h-4 w-24 bg-stone-200 rounded" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-16 bg-stone-100 rounded-lg" />
          ))}
        </div>
      </div>

      {/* 기도제목 카드들 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-stone-100 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-stone-100" />
            <div className="h-4 w-20 bg-stone-200 rounded" />
          </div>
          <div className="h-3 w-full bg-stone-100 rounded" />
          <div className="h-3 w-3/4 bg-stone-100 rounded" />
        </div>
      ))}
    </div>
  );
}
