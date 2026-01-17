/**
 * Team Management Page
 * 
 * Manage team members, roles, and permissions.
 */

import { PageHeader } from '@/components/ui';
import { TeamManager } from '@/src/features/settings/components/TeamManager';

export default function TeamManagementPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Team Management"
                description="Manage your team members and control their access to the platform."
            />
            <TeamManager />
        </div>
    );
}
