'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { QUERY_CONFIG } from '../api/config/query-client';

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
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster
                position="top-right"
                richColors
                closeButton
                theme="dark"
            />
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
}

