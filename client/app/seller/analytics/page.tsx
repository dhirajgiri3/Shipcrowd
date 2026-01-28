/**
 * Analytics Page (Server Component)
 * 
 * Server Component shell for the Analytics dashboard.
 * Wraps client functionality in AnalyticsClient.tsx.
 */

import { AnalyticsClient } from './components/AnalyticsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Analytics Overview | Shipcrowd Seller Panel',
    description: 'Deep dive into your business metrics and shipping performance.',
};

export default function AnalyticsPage() {
    return <AnalyticsClient />;
}
