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

import { BulkAddressValidationClient } from './components/BulkAddressValidationClient';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';

export default function BulkAddressValidationPage() {
  return (
    <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
      <PageHeader
        title="Bulk Address Validation"
        description="Upload a CSV file to validate multiple addresses and check serviceability"
        breadcrumbs={[
          { label: 'Tools', href: '/seller/tools' },
          { label: 'Bulk Address Validation', active: true },
        ]}
        backUrl="/seller/tools"
      />

      <BulkAddressValidationClient />
    </div>
  );
}
