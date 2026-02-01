/**
 * Seller Orders Page (Server Component)
 * 
 * This Server Component:
 * - Renders on the server for fast initial load
 * - Can fetch orders data server-side (when API is ready)
 * - Passes to client component for interactivity
 * - Reduces JavaScript bundle size significantly
 * 
 * All interactive UI (table, filters, search) is in components/OrdersClient.tsx
 */

import { OrdersClient } from './components/OrdersClient';
import { DashboardErrorBoundary } from '@/src/components/errors/DashboardErrorBoundary';

export default function SellerOrdersPage() {
    // TODO: Fetch orders from API server-side
    // const orders = await getOrders();
    // return <OrdersClient initialOrders={orders} />;

    // For now, client component handles its own data
    return (
        <DashboardErrorBoundary>
            <OrdersClient />
        </DashboardErrorBoundary>
    );
}
