/**
 * Warehouses Page (Server Component)
 * 
 * This Server Component:
 * - Renders on the server for fast initial load
 * - Reduces JavaScript bundle size
 * - Can add metadata for SEO (warehouse management doesn't need it)
 * - Could fetch initial data server-side in future
 * 
 * All interactive UI is in components/WarehousesClient.tsx
 */

import { WarehousesClient } from './components/WarehousesClient';

export default function WarehousesPage() {
    // Server component - no hooks, no "use client"
    // For now, client component handles data fetching with React Query
    // This pattern allows us to add server-side data fetching later if needed

    return <WarehousesClient />;
}
