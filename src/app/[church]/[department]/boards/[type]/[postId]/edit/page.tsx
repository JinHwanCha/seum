import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { PostForm } from '@/components/board/post-form';
import { Card, CardTitle } from '@/components/ui/card';
import { BOARD_TYPE_LABELS } from '@/lib/constants';

interface PageProps {
  params: { church: string; department: string; type: string; postId: string };
}

export default async function EditPostPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const supabase = createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('*, category:board_categories(id, name)')
    .eq('id', params.postId)
    .single();

  if (!post) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardTitle>{BOARD_TYPE_LABELS[params.type] || params.type} 수정</CardTitle>
        <PostForm boardType={params.type} existingPost={post as any} />
      </Card>
    </div>
  );
}
