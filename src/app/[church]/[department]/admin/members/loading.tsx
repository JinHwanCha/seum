// admin 하위 페이지 공통 로딩 스켈레톤
export default function AdminSubPageLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-32 bg-stone-200 rounded" />
      <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-stone-100" />
              <div className="space-y-1">
                <div className="h-4 w-24 bg-stone-200 rounded" />
                <div className="h-3 w-16 bg-stone-100 rounded" />
              </div>
            </div>
            <div className="h-7 w-16 bg-stone-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
