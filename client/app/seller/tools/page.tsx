/**
 * Seller Tools Index Page
 * Lists available tools: Pincode Checker, Bulk Address Validation
 */

import Link from 'next/link';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { MapPin, CheckSquare } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';

const TOOLS = [
  {
    label: 'Pincode Checker',
    href: '/seller/tools/pincode-checker',
    icon: MapPin,
    description: 'Check delivery coverage and courier availability for any pincode in India',
  },
  {
    label: 'Bulk Address Validation',
    href: '/seller/tools/bulk-address-validation',
    icon: CheckSquare,
    description: 'Upload a CSV to validate multiple addresses and check serviceability',
  },
] as const;

export default function ToolsPage() {
  return (
    <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
      <PageHeader
        title="Tools"
        description="Utility tools for address validation and serviceability checks"
        showBack={true}
        backUrl="/seller"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group block rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-6 transition-all hover:border-[var(--border-strong)] hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]">
                <tool.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">
                  {tool.label}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {tool.description}
                </p>
                <Button variant="link" size="sm" className="mt-3 -ml-1">
                  Open tool →
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
