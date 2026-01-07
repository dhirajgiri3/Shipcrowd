import { AdminLayoutClient } from './components/AdminLayoutClient';

/**
 * Admin Dashboard Layout (Server Component)
 * 
 * This is a Server Component that wraps the client-side layout.
 * Benefits:
 * - Faster initial page load
 * - Smaller JavaScript bundle
 * - Better SEO
 * - Server-side data fetching capability
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
