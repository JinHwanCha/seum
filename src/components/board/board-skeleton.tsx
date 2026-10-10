export function BoardSkeleton() {
  return (
    <div role="status" aria-label="게시판 불러오는 중" className="space-y-2" aria-busy="true">
      {[1, 2].map((item) => (
        <div key={item} aria-hidden="true" className="rounded-xl border border-stone-200/60 p-3">
          <div className="h-3 w-1/2 rounded bg-stone-100" />
          <div className="mt-2 h-2 w-3/4 rounded bg-stone-100" />
        </div>
      ))}
      <span className="sr-only">게시판을 불러오는 중입니다.</span>
    </div>
  );
}
