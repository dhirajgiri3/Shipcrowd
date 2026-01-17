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
                description="Configure automated risk rules and monitor suspicious activities."
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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
