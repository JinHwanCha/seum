import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 쿼리당 최대 대기 시간. 무료 플랜에서 커넥션이 매달려 무한정 걸리는 것을 방지한다.
const REQUEST_TIMEOUT_MS = 10_000;
// 멱등(GET/HEAD) 요청에 한해 일시적 오류를 재시도하는 횟수.
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 200;

function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input === 'object' && input !== null && 'method' in input) {
    return (input as Request).method.toUpperCase();
  }
  return 'GET';
}

// 멱등 요청만 재시도한다. POST/PATCH/DELETE 재시도는 중복 쓰기를 유발할 수 있으므로 제외.
function isIdempotent(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 타임아웃과(멱등 요청 한정) 자동 재시도를 더한 fetch.
// Supabase 클라이언트의 모든 쿼리가 이 fetch 를 통해 나가므로 전역에 적용된다.
const resilientFetch: typeof fetch = async (input, init) => {
  const method = getMethod(input, init);
  const maxAttempts = isIdempotent(method) ? MAX_RETRIES + 1 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // 호출자가 전달한 AbortSignal 도 존중한다.
    const callerSignal = init?.signal;
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort();
      else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timer);
      // 일시적 서버 오류(5xx/429)는 멱등 요청에 한해 재시도.
      if (attempt < maxAttempts - 1 && (res.status >= 500 || res.status === 429)) {
        lastError = new Error(`HTTP ${res.status}`);
        await delay(BASE_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      // 호출자가 직접 취소한 경우엔 재시도하지 않는다.
      if (callerSignal?.aborted) throw err;
      if (attempt < maxAttempts - 1) {
        await delay(BASE_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

// Singleton: reuse the same client instance for connection pooling
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
  global: { fetch: resilientFetch },
});

export function createClient() {
  return supabase;
}

