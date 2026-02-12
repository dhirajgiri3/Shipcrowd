/**
 * Public RTO (Return to Origin) tracking page.
 * Customers can look up reverse shipment status by AWB or order number + phone.
 */

import { Suspense } from 'react';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { RTOTrackClient } from './RTOTrackClient';

export default function RTOTrackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                    <Loader variant="truck" size="lg" message="Loading..." centered />
                </div>
            }
        >
            <RTOTrackClient />
        </Suspense>
    );
}
