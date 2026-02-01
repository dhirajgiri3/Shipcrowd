import { ZoneCreateClient } from './components/ZoneCreateClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Create Zone | Shipcrowd Admin',
    description: 'Create a new shipping zone and configure pincode mappings',
};

export default function CreateZonePage() {
    return <ZoneCreateClient />;
}

