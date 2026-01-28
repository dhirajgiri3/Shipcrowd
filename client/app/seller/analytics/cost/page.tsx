/**
 * Cost Analysis Page (Server Component)
 * 
 * Shell component for cost analytics.
 * Wraps feature component from src/features/analytics.
 */

import { CostAnalysisClient } from '@/src/features/analytics';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cost Analysis | Shipcrowd',
    description: 'Analyze shipping costs, identify trends, and find savings opportunities.',
};

export default function CostAnalysisPage() {
    return <CostAnalysisClient />;
}
