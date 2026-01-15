import { SellerLayoutClient } from './components/SellerLayoutClient';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';

/**
 * Seller Dashboard Layout (Server Component)
 * 
 * This is a Server Component that wraps the client-side layout.
 * Benefits:
 * - Faster initial page load
 * - Smaller JavaScript bundle
 * - Better SEO
 * - Server-side data fetching capability
 * 
 * All interactive logic is in components/SellerLayoutClient.tsx
 */
export default function SellerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary>
            <SellerLayoutClient>{children}</SellerLayoutClient>
        </ErrorBoundary>
    );
}
