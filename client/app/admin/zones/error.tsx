'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/core/Button';

export default function ZonesError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[400px] w-full flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-semibold">Something went wrong!</h2>
            <p className="text-muted-foreground">{error.message}</p>
            <Button onClick={reset}>Try again</Button>
        </div>
    );
}
