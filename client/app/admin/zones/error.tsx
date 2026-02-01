'use client';

import { PageError } from '@/src/components/ui';

export default function ZonesError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return <PageError error={error} reset={reset} homeUrl="/admin/zones" />;
}
