/**
 * Seller Dashboard Page (Server Component)
 * 
 * This Server Component:
 * - Renders on the server (fast initial load)
 * - Can fetch data server-side (when implemented)
 * - Passes to client component for interactivity
 * - Reduces JavaScript bundle size significantly
 * 
 * All interactive UI (charts, animations, state) is in components/DashboardClient.tsx
 */

import { DashboardClient } from './components/DashboardClient';
import { DashboardErrorBoundary } from '@/src/components/errors/DashboardErrorBoundary';
import { DashboardDateProvider } from '@/src/contexts/DashboardDateContext';

export default function SellerDashboardPage() {
    // TODO: Fetch dashboard data from API server-side
    // const data = await getDashboardData();
    // return <DashboardClient initialData={data} />;

    // For now, client component handles its own data with error boundary protection
    return (
        <DashboardErrorBoundary>
            <DashboardDateProvider>
                <DashboardClient />
            </DashboardDateProvider>
        </DashboardErrorBoundary>
    );
}
