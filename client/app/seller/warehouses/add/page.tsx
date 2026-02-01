/**
 * Add Warehouse Page (Server Component)
 * 
 * This Server Component:
 * - Renders on the server for fast initial load
 * - Reduces JavaScript bundle size (no hooks, no interactivity here)
 * - Can add metadata for SEO (if needed in future)
 * - Simply renders the client component
 * 
 * All interactive UI is in components/AddWarehouseClient.tsx
 */

import { AddWarehouseClient } from './components/AddWarehouseClient';

export default function AddWarehousePage() {
    // Server component - no hooks, no "use client"
    // Could fetch data server-side here if needed
    // For now, client component handles form logic

    return <AddWarehouseClient />;
}
