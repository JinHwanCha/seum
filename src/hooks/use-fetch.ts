'use client';

import { useState, useCallback } from 'react';

interface UseFetchOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useFetch<T = any>(options?: UseFetchOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (url: string, init?: RequestInit) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, init);
        const json = await res.json();
        if (!res.ok) {
          const errMsg = json.error || '요청에 실패했습니다.';
          setError(errMsg);
          options?.onError?.(errMsg);
          return null;
        }
        setData(json.data ?? json);
        options?.onSuccess?.(json.data ?? json);
        return json.data ?? json;
      } catch (err) {
        const errMsg = '네트워크 오류가 발생했습니다.';
        setError(errMsg);
        options?.onError?.(errMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { data, loading, error, execute, setData };
}
