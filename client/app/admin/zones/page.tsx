import { ZonesClient } from './components/ZonesClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Zone Management | Helix Admin',
    description: 'Configure pricing zones and pincode mappings for shipping calculations',
};

export default function ZonesPage() {
    return <ZonesClient />;
}

