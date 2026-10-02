export default function DepartmentLoading() {
  return (
    <div role="status" aria-label="페이지 로딩 중" className="space-y-4 animate-pulse motion-reduce:animate-none">
      <div aria-hidden="true" className="h-7 w-32 rounded bg-stone-200" />
      <div aria-hidden="true" className="h-10 w-full rounded-lg bg-stone-100" />
      <div aria-hidden="true" className="h-32 w-full rounded-lg bg-stone-100" />
      <div aria-hidden="true" className="h-48 w-full rounded-lg bg-stone-100" />
    </div>
  );
}