/**
 * Wallet & Financials Dashboard
 * 
 * Comprehensive financial management page displaying:
 * - Wallet balance with hero display
 * - Spending insights and analytics
 * - Transaction history
 * - Quick recharge functionality
 * 
 * Route: /seller/wallet
 */

import { WalletPageClient } from './components/WalletPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Wallet & Financials | Shipcrowd',
    description: 'Manage your wallet balance, view transactions, and track spending insights',
};

export default function WalletPage() {
    return <WalletPageClient />;
}
