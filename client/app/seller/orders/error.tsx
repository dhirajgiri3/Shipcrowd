'use client';

import { PageError } from '@/src/components/ui';

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
