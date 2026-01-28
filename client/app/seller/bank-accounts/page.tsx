/**
 * Bank Accounts Page (Server Component)
 * 
 * This Server Component:
 * - Renders on the server for fast initial load
 * - Provides metadata for SEO/social sharing
 * - Wraps the interactive client component in an Error Boundary
 */

import { BankAccountsClient } from './components/BankAccountsClient';
import { DashboardErrorBoundary } from '@/src/components/errors/DashboardErrorBoundary';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Bank Accounts | Shipcrowd Seller Panel',
    description: 'Manage your settlement bank accounts and payouts.',
};

export default function BankAccountsPage() {
    return (
        <DashboardErrorBoundary>
            <BankAccountsClient />
        </DashboardErrorBoundary>
    );
}
