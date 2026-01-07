/**
 * Shipments Page (Server Component)
 * 
 * Server Component wrapper for shipments tracking.
 * All interactive logic is in components/ShipmentsClient.tsx
 */

import { ShipmentsClient } from './components/ShipmentsClient';

export default function ShipmentsPage() {
    // TODO: Fetch shipments data server-side
    // const shipments = await getShipments();
    // return <ShipmentsClient initialShipments={shipments} />;

    return <ShipmentsClient />;
}
