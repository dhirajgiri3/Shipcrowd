/**
 * Audit Logs Page
 * 
 * View and export audit trail of all system activities.
 */

'use client';

import { PageHeader } from '@/src/components/ui';
import { AuditLogsViewer } from '@/src/features/settings/components/AuditLogsViewer';

export default function AuditLogsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Audit Logs"
                description="Track all activities and security events in your account."
            />
            <AuditLogsViewer />
        </div>
    );
}
