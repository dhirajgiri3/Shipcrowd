import { AdminLayoutClient } from './components/AdminLayoutClient';

/**
 * Admin Dashboard Layout (Server Component)
 *
 * This is a Server Component that wraps the client-side layout.
 *
 * All interactive logic is in components/AdminLayoutClient.tsx
 */
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
