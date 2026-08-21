import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Singleton: reuse the same client instance for connection pooling
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

export function createClient() {
  return supabase;
}

// 일시적 DB 오류(커넥션 타임아웃/네트워크 순단)만 재시도한다.
// 결과가 정상적으로 돌아온 경우(데이터 없음 포함)에는 재시도하지 않는다.
function isTransientError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    (typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : String(error)
    ).toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('connection') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('terminated')
  );
}

/**
 * Supabase 쿼리를 일시적 오류에 한해 지수 백오프로 재시도한다.
 * @param run PostgrestBuilder 를 반환하는 함수(호출마다 새 쿼리를 만들어야 함)
 */
export async function withRetry<T extends { error: unknown }>(
  run: () => PromiseLike<T>,
  retries = 2,
  baseDelayMs = 150
): Promise<T> {
  let last: T | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await run();
    if (!result.error || !isTransientError(result.error)) return result;
    last = result;
    if (attempt < retries) {
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return last as T;
}
