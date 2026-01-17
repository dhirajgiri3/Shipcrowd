/**
 * Weight Disputes Dashboard Page
 * 
 * Main page for sellers to view and manage weight disputes:
 * - Dashboard metrics (total disputes, pending, financial impact)
 * - Disputes table with filters
 * - Quick stats cards
 * 
 * Route: /seller/disputes/weight
 */

import { WeightDisputesClient } from './components/WeightDisputesClient';

export default function WeightDisputesPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Weight Disputes
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Manage weight discrepancies between declared and actual weights
                </p>
            </div>

            <WeightDisputesClient />
        </div>
    );
}
