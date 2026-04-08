'use client';

import { SWRConfig } from 'swr';
import { AuthProvider } from '@/hooks/use-auth';

const swrFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher: swrFetcher, revalidateOnFocus: false, dedupingInterval: 5000 }}>
      <AuthProvider>{children}</AuthProvider>
    </SWRConfig>
  );
}
