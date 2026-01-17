/**
 * Wallet Dashboard Page
 * 
 * Main wallet page displaying:
 * - Current balance with Add/Withdraw modals
 * - Recent transactions
 * - Wallet statistics
 * 
 * Route: /seller/wallet
 */

import { WalletPageClient } from './components/WalletPageClient';

export default function WalletPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Wallet
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Manage your wallet balance and view transaction history
                </p>
            </div>

            <WalletPageClient />
        </div>
    );
}
