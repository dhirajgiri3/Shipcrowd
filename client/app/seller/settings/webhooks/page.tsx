/**
 * Webhook Management Page
 * 
 * Configure and manage webhooks for real-time event notifications.
 */

import { PageHeader } from '@/src/components/ui';
import { WebhooksManager } from '@/src/features/settings/components/WebhooksManager';

export default function WebhooksPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Webhooks"
                description="Configure real-time event notifications for your application events."
            />
            <WebhooksManager />
        </div>
    );
}
