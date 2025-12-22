'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Global defaults for all queries
                        staleTime: 30000, // 30 seconds
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                    mutations: {
                        // Global defaults for all mutations
                        retry: 0,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                    },
                    success: {
                        iconTheme: {
                            primary: 'hsl(var(--success))',
                            secondary: 'white',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: 'hsl(var(--destructive))',
                            secondary: 'white',
                        },
                    },
                }}
            />
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
}
