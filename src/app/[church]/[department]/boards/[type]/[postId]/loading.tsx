import { Card } from '@/components/ui/card';

// 상세 페이지 서버 렌더가 끝나기 전 즉시 보여줄 스켈레톤.
// 이 로딩 경계 덕분에 <Link> 프리페치가 동작해 클릭 시 화면이 바로 전환된다.
export default function PostDetailLoading() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 w-24 rounded bg-stone-100" />

      <Card>
        <div className="mb-4 space-y-2">
          <div className="h-5 w-16 rounded bg-stone-100" />
          <div className="h-6 w-3/4 rounded bg-stone-100" />
          <div className="flex gap-2">
            <div className="h-4 w-16 rounded bg-stone-100" />
            <div className="h-4 w-24 rounded bg-stone-100" />
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <div className="h-4 w-full rounded bg-stone-100" />
          <div className="h-4 w-full rounded bg-stone-100" />
          <div className="h-4 w-2/3 rounded bg-stone-100" />
        </div>

        <div className="h-9 w-full rounded-lg bg-stone-100" />
      </Card>
    </div>
  );
}
