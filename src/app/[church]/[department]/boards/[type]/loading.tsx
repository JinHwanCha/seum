// 게시판 목록 로딩 스켈레톤
export default function BoardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-20 bg-stone-200 rounded" />
        <div className="h-8 w-20 bg-stone-200 rounded-lg" />
      </div>

      {/* 게시글 카드 스켈레톤 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-stone-100 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-stone-100 rounded" />
            <div className="h-4 w-32 bg-stone-200 rounded" />
          </div>
          <div className="h-3 w-48 bg-stone-100 rounded" />
          <div className="flex gap-3 mt-2">
            <div className="h-3 w-16 bg-stone-100 rounded" />
            <div className="h-3 w-12 bg-stone-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
