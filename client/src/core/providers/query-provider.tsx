'use client';

import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { useState } from 'react';
import { QUERY_CONFIG } from '../api/config/query-client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from '../api/lib/idb-persister';

const persister = createIDBPersister();

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: QUERY_CONFIG.staleTime.default,
                        gcTime: QUERY_CONFIG.gcTime,
                        refetchOnWindowFocus: QUERY_CONFIG.refetchOnWindowFocus,
                        retry: QUERY_CONFIG.retry.queries,
                        networkMode: QUERY_CONFIG.networkMode,
                    },
                    mutations: {
                        retry: QUERY_CONFIG.retry.mutations,
                        networkMode: QUERY_CONFIG.networkMode,
                    },
                },
            })
    );

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: 1000 * 60 * 60 * 24, // 24 hours
                buster: `v${process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}`, // Auto-bust on version change
            }}
        >
            {children}

            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </PersistQueryClientProvider>
    );
}

