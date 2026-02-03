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
        <div className="min-h-screen bg-[var(--bg-tertiary)]">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/seller/tools"
                        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary-blue)] mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Tools
                    </Link>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                        Bulk Address Validation
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        Upload a CSV file to validate multiple addresses and check serviceability
                    </p>
                </div>

                {/* Main Content */}
                <BulkAddressValidationClient />
            </div>
        </div>
    );
}
