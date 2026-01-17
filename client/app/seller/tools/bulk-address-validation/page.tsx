/**
 * Bulk Address Validation Page
 * 
 * Upload CSV of addresses to validate serviceability in bulk.
 * Features:
 * - CSV file upload with drag & drop
 * - Parse and validate addresses
 * - Show validation results with errors
 * - Export invalid addresses
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BulkAddressValidationClient } from './components/BulkAddressValidationClient';

export default function BulkAddressValidationPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/seller/tools"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Tools
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Bulk Address Validation
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Upload a CSV file to validate multiple addresses and check serviceability
                    </p>
                </div>

                {/* Main Content */}
                <BulkAddressValidationClient />
            </div>
        </div>
    );
}
