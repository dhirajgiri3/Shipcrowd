/**
 * Cost Analysis Page
 * 
 * Page for analyzing shipping costs.
 */

import { PageHeader } from '@/components/ui';
import { CostAnalysis } from '@/src/features/analytics/components/CostAnalysis';

export default function CostAnalysisPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Cost Analysis"
                description="Deep dive into your shipping expenses and identify cost-saving opportunities."
            />
            <CostAnalysis />
        </div>
    );
}
