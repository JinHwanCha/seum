// 서버 전용 게시글 목록 로더.
// 게시판 서버 컴포넌트와 /api/posts GET(더 보기)이 동일한 select/가시성/정렬을
// 공유하도록 한곳에 모은다. SUPABASE_SERVICE_ROLE_KEY 를 쓰므로 서버 전용이다.
import { createClient } from './supabase';

export const POSTS_PAGE_SIZE = 20;

// 목록에 필요한 컬럼만 조회한다. 무거운 images(base64) 대신 thumbnail/image_count 만 가져온다.
const LIST_SELECT =
  'id, title, content, board_type, gathering_type, is_pinned, visibility, created_at, updated_at, author_id, category_id, village_id, department_id, image_count, thumbnail, author:users(id, name, role, minister_rank, village_id, birth_date), category:board_categories(id, name), village:villages(id, name), comments(count), reactions(count)';

export interface LoadBoardPostsParams {
  departmentId: string;
  boardType: string;
  canSeeAll: boolean;
  villageId: string | null;
  limit?: number;
  offset?: number;
}

export interface LoadBoardPostsResult {
  posts: any[];
  hasMore: boolean;
}

function enrich(post: any) {
  return {
    ...post,
    images: post.thumbnail ? [post.thumbnail] : [],
    _imageCount: post.image_count ?? 0,
    _count: {
      comments: (post.comments as any[])?.[0]?.count ?? 0,
      reactions: (post.reactions as any[])?.[0]?.count ?? 0,
    },
  };
}

export async function loadBoardPosts({
  departmentId,
  boardType,
  canSeeAll,
  villageId,
  limit = POSTS_PAGE_SIZE,
  offset = 0,
}: LoadBoardPostsParams): Promise<LoadBoardPostsResult> {
  const supabase = createClient();

  let query = supabase
    .from('posts')
    .select(LIST_SELECT)
    .eq('department_id', departmentId)
    .eq('board_type', boardType)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  // 가시성 필터: 사역자/마을장은 전체, 그 외는 'all' + 본인 마을.
  if (!canSeeAll) {
    if (villageId) {
      query = query.or(`visibility.eq.all,village_id.eq.${villageId}`);
    } else {
      query = query.eq('visibility', 'all');
    }
  }

  // hasMore 판별을 위해 한 건 더 요청한다.
  query = query.range(offset, offset + limit);

  const { data } = await query;
  const rows = (data || []) as any[];
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit).map(enrich);

  return { posts, hasMore };
}
