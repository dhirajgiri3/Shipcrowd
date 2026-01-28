/**
 * Returns Dashboard Page (Server Component)
 * 
 * Route: /seller/returns
 * Wraps interactive client logic.
 */

import { ReturnsClient } from '@/src/features/returns';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Returns Management | Shipcrowd',
    description: 'Manage product returns, refunds, and exchange requests.',
};

export default function ReturnsDashboardPage() {
    return <ReturnsClient />;
}
