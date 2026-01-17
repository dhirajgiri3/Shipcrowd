/**
 * SLA Dashboard Page
 * 
 * Page for tracking Service Level Agreement compliance.
 */

import { PageHeader } from '@/components/ui';
import { SLADashboard } from '@/src/features/analytics/components/SLADashboard';

export default function SLADashboardPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="SLA Dashboard"
                description="Monitor your operational performance and SLA compliance in real-time."
            />
            <SLADashboard />
        </div>
    );
}
