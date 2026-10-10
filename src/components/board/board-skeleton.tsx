export function BoardSkeleton() {
  return (
    <div role="status" aria-label="게시판 불러오는 중" className="space-y-2" aria-busy="true">
      {[1, 2, 3].map((item) => (
        <div key={item} aria-hidden="true" className="h-20 rounded-xl bg-stone-100 animate-pulse motion-reduce:animate-none" />
      ))}
      <span className="sr-only">게시판을 불러오는 중입니다.</span>
    </div>
  );
}
