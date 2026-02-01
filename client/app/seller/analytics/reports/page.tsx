/**
 * Analytics Reports Page
 * 
 * Page for building custom analytics reports.
 */

import { PageHeader } from '@/src/components/ui';
import { ReportBuilder } from '@/src/features/analytics/components/ReportBuilder';

export default function AnalyticsReportsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Custom Reports"
                description="Build and export custom analytics reports based on your specific needs."
            />
            <ReportBuilder />
        </div>
    );
}
