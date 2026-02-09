/**
 * Fraud Detection Page
 * 
 * Comprehensive dashboard for managing fraud rules and monitoring security alerts.
 */

import { PageHeader } from '@/src/components/ui';
import { FraudRulesConfig } from '@/src/features/security/components/FraudRulesConfig';
import { FraudAlerts } from '@/src/features/security/components/FraudAlerts';

export default function FraudDetectionPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Fraud Detection"
                subtitle="Configure automated risk rules and monitor suspicious activities."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin' },
                    { label: 'Security', href: '/admin/security' },
                    { label: 'Fraud Detection', active: true },
                ]}
            />

            {/* Feature Disabled Banner */}
            <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-lg p-4 flex items-start gap-3">
                <div className="p-1 bg-[var(--warning)]/10 rounded-full">
                    {/* Icon can be imported from lucide-react if not available, assuming inline for now or importing */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 text-[var(--warning)]"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" x2="12" y1="8" y2="12" />
                        <line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                </div>
                <div>
                    <h4 className="font-semibold text-[var(--warning-text)] text-sm">Feature Archived</h4>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        The Fraud Detection module has been archived and is no longer processing new events.
                        View-only access is retained for historical data.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 opacity-60 pointer-events-none grayscale-[0.5]">
                {/* Rules Section - 1/3 width on large screens */}
                <div className="xl:col-span-1 space-y-6">
                    <FraudRulesConfig />
                </div>

                {/* Alerts Section - 2/3 width on large screens */}
                <div className="xl:col-span-2 space-y-6">
                    <FraudAlerts />
                </div>
            </div>
        </div>
    );
}
