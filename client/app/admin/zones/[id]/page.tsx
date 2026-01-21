import { ZoneDetailClient } from './components/ZoneDetailClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Zone Details | Helix Admin',
    description: 'View and manage zone details and pincode mappings',
};

export default function ZoneDetailPage({ params }: { params: { id: string } }) {
    return <ZoneDetailClient id={params.id} />;
}

