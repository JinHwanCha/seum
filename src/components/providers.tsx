'use client';

import { SWRConfig } from 'swr';
import { AuthProvider } from '@/hooks/use-auth';
import type { SessionPayload } from '@/lib/types';

const swrFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  });

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionPayload | null;
}) {
  return (
    <SWRConfig value={{ fetcher: swrFetcher, revalidateOnFocus: false, dedupingInterval: 10000, keepPreviousData: true }}>
      <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
    </SWRConfig>
  );
}
