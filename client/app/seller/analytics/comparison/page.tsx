/**
 * Courier Comparison Page
 * 
 * Page for comparing courier performance.
 */

import { PageHeader } from '@/components/ui';
import { CourierComparison } from '@/src/features/analytics/components/CourierComparison';

export default function CourierComparisonPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Courier Comparison"
                description="Compare courier partners on delivery speed, RTO rates, and costs."
            />
            <CourierComparison />
        </div>
    );
}
