/**
 * Team Management Page
 * 
 * Manage team members, roles, and permissions.
 */

'use client';

import { useState } from 'react';
import { useTeamMembers, useInviteTeamMember, useUpdateMemberRole, useRemoveTeamMember } from '@/src/core/api/hooks/useSettings';
import { UserPlus, Mail, Trash2, Shield } from 'lucide-react';
import { cn, formatDate } from '@/src/lib/utils';
import type { InviteTeamMemberPayload, TeamRole, TeamMember } from '@/src/types/api/settings.types';

const TEAM_ROLES: { value: TeamRole; label: string; description: string }[] = [
    { value: 'owner', label: 'Owner', description: 'Full access to all features' },
    { value: 'admin', label: 'Admin', description: 'Manage all settings except team' },
    { value: 'manager', label: 'Manager', description: 'Manage shipments, orders, and reports' },
    { value: 'member', label: 'Member', description: 'Create and view shipments and orders' },
    { value: 'viewer', label: 'Viewer', description: 'View-only access' },
];

export default function TeamManagementPage() {
    const [showInviteModal, setShowInviteModal] = useState(false);

    const { data: members, isLoading } = useTeamMembers();
    const { mutate: inviteMember, isPending: isInviting } = useInviteTeamMember();
    const { mutate: updateRole } = useUpdateMemberRole();
    const { mutate: removeMember } = useRemoveTeamMember();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Team Management</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage team members and their permissions</p>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Invite Member
                    </button>
                </div>

                {/* Members Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700 dark:text-gray-300">Member</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Joined</th>
                                <th className="text-right py-3 px-6 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members?.map((member: TeamMember, index: number) => (
                                <tr
                                    key={member._id}
                                    className={index !== (members?.length || 0) - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                                >
                                    <td className="py-4 px-6">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <select
                                            value={member.teamRole}
                                            onChange={(e) => updateRole({ memberId: member._id, teamRole: e.target.value as TeamRole })}
                                            disabled={member.teamRole === 'owner'}
                                            className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-50"
                                        >
                                            {TEAM_ROLES.map((role) => (
                                                <option key={role.value} value={role.value}>{role.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={cn(
                                            'px-2 py-1 rounded text-xs font-medium',
                                            member.teamStatus === 'active' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                            member.teamStatus === 'invited' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                                            member.teamStatus === 'suspended' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                        )}>
                                            {member.teamStatus}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                                        {formatDate(member.joinedAt)}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        {member.teamRole !== 'owner' && (
                                            <button
                                                onClick={() => removeMember(member._id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Invite Modal */}
                {showInviteModal && (
                    <InviteMemberModal
                        onClose={() => setShowInviteModal(false)}
                        onInvite={(payload) => {
                            inviteMember(payload);
                            setShowInviteModal(false);
                        }}
                        isInviting={isInviting}
                    />
                )}
            </div>
        </div>
    );
}

function InviteMemberModal({ onClose, onInvite, isInviting }: {
    onClose: () => void;
    onInvite: (payload: InviteTeamMemberPayload) => void;
    isInviting: boolean;
}) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Exclude<TeamRole, 'owner'>>('member');
    const [message, setMessage] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invite Team Member</h2>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="member@company.com"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role *</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as Exclude<TeamRole, 'owner'>)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {TEAM_ROLES.filter(r => r.value !== 'owner').map((r) => (
                                <option key={r.value} value={r.value}>{r.label} - {r.description}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message (Optional)</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Add a personal message..."
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isInviting}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onInvite({ email, name: email.split('@')[0], teamRole: role, message: message || undefined })}
                        disabled={!email || isInviting}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        {isInviting ? 'Sending...' : 'Send Invitation'}
                    </button>
                </div>
            </div>
        </div>
    );
}
