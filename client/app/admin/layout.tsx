import { AdminLayoutClient } from './components/AdminLayoutClient';
import { DateRangeProvider } from '@/src/lib/data';

/**
 * Admin Dashboard Layout (Server Component)
 *
 * This is a Server Component that wraps the client-side layout.
 * DateRangeProvider allows the dashboard and date picker to share range state.
 *
 * All interactive logic is in components/AdminLayoutClient.tsx
 */
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DateRangeProvider>
            <AdminLayoutClient>{children}</AdminLayoutClient>
        </DateRangeProvider>
    );
}
