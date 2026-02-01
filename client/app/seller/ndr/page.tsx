/**
 * NDR Management Page (Server Component)
 * 
 * This Server Component:
 * - Renders on the server for fast initial load
 * - Can fetch NDR data server-side (when API is ready)
 * - Passes to client component for interactivity
 * - Reduces JavaScript bundle size significantly
 * 
 * All interactive UI (filters, search, table) is in components/NDRClient.tsx
 */

import { NDRClient } from '@/src/features/ndr';

export default function NDRPage() {
    // TODO: Fetch NDR data from API server-side
    // const ndrData = await getNDRCases();
    // return <NDRClient initialData={ndrData} />;

    // For now, client component handles its own data (mock)
    return <NDRClient />;
}
