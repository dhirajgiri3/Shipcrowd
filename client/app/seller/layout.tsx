import { SellerLayoutClient } from './SellerLayoutClient';

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
 * All interactive logic is in SellerLayoutClient.tsx
 */
export default function SellerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <SellerLayoutClient>{children}</SellerLayoutClient>;
}
