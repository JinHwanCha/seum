'use client';

import { useParams } from 'next/navigation';
import { PostForm } from '@/components/board/post-form';
import { Card, CardTitle } from '@/components/ui/card';
import { BOARD_TYPE_LABELS } from '@/lib/constants';

export default function NewPostPage() {
  const params = useParams();
  const boardType = params.type as string;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardTitle>{BOARD_TYPE_LABELS[boardType] || boardType} 글쓰기</CardTitle>
        <PostForm boardType={boardType} />
      </Card>
    </div>
  );
}
