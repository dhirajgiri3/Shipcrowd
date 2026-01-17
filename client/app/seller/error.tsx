'use client';

import { PageError } from '@/src/components/ui';

export default function SellerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError error={error} reset={reset} homeUrl="/seller" />;
}
