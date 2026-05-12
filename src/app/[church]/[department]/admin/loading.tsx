// 관리 페이지 로딩 스켈레톤
export default function AdminLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-12 bg-stone-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-100 bg-white p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-stone-200 rounded" />
              <div className="h-3 w-36 bg-stone-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
