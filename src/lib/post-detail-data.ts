import { createClient } from '@/lib/supabase';
import { postLookupColumn } from '@/lib/posts-data';
import type { SessionPayload } from '@/lib/types';

export async function loadPostContent(session: SessionPayload, boardType: string | null, identifier: string) {
  let query = createClient().from('posts').select(`
    id, slug, department_id, board_type, category_id, author_id, title, content, images,
    gathering_type, visibility, village_id, is_pinned, created_at, updated_at,
    author:users(id, name, role, minister_rank, birth_date, is_early_birth, village:villages(id, name)),
    category:board_categories(id, name),
    village:villages(id, name)
  `).eq(postLookupColumn(identifier), identifier).eq('department_id', session.departmentId);
  if (boardType) query = query.eq('board_type', boardType);
  const { data: post, error } = await query.maybeSingle();
  if (error) throw error;
  if (!post) return null;
  const canView = post.author_id === session.userId || session.role === 'minister' ||
    post.visibility === 'all' || (post.visibility === 'village' &&
      (session.role === 'village_leader' || (post.village_id && post.village_id === session.villageId)));
  return canView ? post : null;
}

export async function loadPostInteractions(postId: string) {
  const supabase = createClient();
  const [comments, reactions] = await Promise.all([
    supabase.from('comments')
      .select('id, post_id, parent_id, author_id, content, created_at, updated_at, author:users(id, name, role, minister_rank, birth_date, is_early_birth)')
      .eq('post_id', postId).order('created_at', { ascending: true }),
    supabase.from('reactions').select('id, post_id, user_id, emoji, created_at').eq('post_id', postId),
  ]);
  if (comments.error) throw comments.error;
  if (reactions.error) throw reactions.error;
  return {
    comments: (comments.data || []).map((comment) => ({
      ...comment,
      author: Array.isArray(comment.author) ? comment.author[0] : comment.author,
    })),
    reactions: reactions.data || [],
  };
}
