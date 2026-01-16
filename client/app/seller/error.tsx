'use client';

import { PageError } from '@/components/ui';

export default function SellerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError error={error} reset={reset} homeUrl="/seller" />;
}
