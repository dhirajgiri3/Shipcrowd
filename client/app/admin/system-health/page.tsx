import { Metadata } from 'next';
import { SystemHealthClient } from './SystemHealthClient';

export const metadata: Metadata = {
    title: 'System Health Dashboard | Shipcrowd',
    description: 'Monitor system health, performance, and external services',
};

export default function SystemHealthPage() {
    return <SystemHealthClient />;
}
