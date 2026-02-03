
import { Suspense } from 'react';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { TrackClient } from './components/TrackClient';

// Main Export
export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader variant="truck" size="lg" message="Loading..." centered />
      </div>
    }>
      <TrackClient />
    </Suspense>
  );
}