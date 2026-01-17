'use client';

import { PageError } from '@/components/ui';

export default function OrdersError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <PageError
            error={error}
            reset={reset}
            title="Failed to load orders"
            homeUrl="/seller"
        />
    );
}
