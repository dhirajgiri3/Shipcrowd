/**
 * TeamManager Component
 * 
 * Manages team members, roles, inviting new members, and removing existing ones.
 */

'use client';

import { useState } from 'react';
import { useTeamMembers, useInviteTeamMember, useUpdateMemberRole, useRemoveTeamMember } from '@/src/core/api/hooks/useSettings';
import { UserPlus, Trash2, Mail, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { cn, formatDate } from '@/src/lib/utils';
import { Button, Card, Input, Label, Select, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Loader } from '@/src/components/ui';
import type { InviteTeamMemberPayload, TeamRole, TeamMember } from '@/src/types/api/settings.types';

const TEAM_ROLES: { value: TeamRole; label: string; description: string }[] = [
    { value: 'owner', label: 'Owner', description: 'Full access to all features' },
    { value: 'admin', label: 'Admin', description: 'Manage all settings except team' },
    { value: 'manager', label: 'Manager', description: 'Manage shipments, orders, and reports' },
    { value: 'member', label: 'Member', description: 'Create and view shipments and orders' },
    { value: 'viewer', label: 'Viewer', description: 'View-only access' },
];

export function TeamManager() {
    const [showInviteModal, setShowInviteModal] = useState(false);

    const { data: members, isLoading } = useTeamMembers();
    const { mutate: inviteMember, isPending: isInviting } = useInviteTeamMember();
    const { mutate: updateRole } = useUpdateMemberRole();
    const { mutate: removeMember } = useRemoveTeamMember();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader variant="spinner" size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                </Button>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                <th className="text-left py-3 px-6 text-sm font-medium text-[var(--text-secondary)]">Member</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Role</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Joined</th>
                                <th className="text-right py-3 px-6 text-sm font-medium text-[var(--text-secondary)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members?.map((member: TeamMember, index: number) => (
                                <tr
                                    key={member._id}
                                    className={cn(
                                        index !== (members?.length || 0) - 1 ? 'border-b border-[var(--border-subtle)]' : '',
                                        "hover:bg-[var(--bg-secondary)]/50 transition-colors"
                                    )}
                                >
                                    <td className="py-4 px-6">
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{member.name}</p>
                                            <p className="text-sm text-[var(--text-muted)]">{member.email}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <select
                                            value={member.teamRole}
                                            onChange={(e) => updateRole({ memberId: member._id, teamRole: e.target.value as TeamRole })}
                                            disabled={member.teamRole === 'owner'}
                                            className="px-3 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent outline-none transition-shadow"
                                        >
                                            {TEAM_ROLES.map((role) => (
                                                <option key={role.value} value={role.value}>{role.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="py-4 px-4">
                                        <Badge
                                            variant={
                                                member.teamStatus === 'active' ? 'success' :
                                                    member.teamStatus === 'invited' ? 'warning' : 'destructive'
                                            }
                                        >
                                            {member.teamStatus}
                                        </Badge>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-[var(--text-muted)]">
                                        {formatDate(member.joinedAt)}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        {member.teamRole !== 'owner' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeMember(member._id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

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
            <div className="bg-[var(--bg-primary)] rounded-xl max-w-md w-full border border-[var(--border-default)] shadow-xl">
                <div className="p-6 border-b border-[var(--border-subtle)]">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Invite Team Member</h2>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <Label>Email *</Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="member@company.com"
                            className="mt-1.5"
                        />
                    </div>

                    <div>
                        <Label>Role *</Label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as Exclude<TeamRole, 'owner'>)}
                            className="w-full mt-1.5 px-3 py-2 rounded-md border border-[var(--border-input)] bg-[var(--bg-background)] text-sm ring-offset-[var(--bg-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                        >
                            {TEAM_ROLES.filter(r => r.value !== 'owner').map((r) => (
                                <option key={r.value} value={r.value}>{r.label} - {r.description}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label>Message (Optional)</Label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Add a personal message..."
                            rows={3}
                            className="w-full mt-1.5 flex min-h-[80px] rounded-md border border-[var(--border-input)] bg-[var(--bg-background)] px-3 py-2 text-sm ring-offset-[var(--bg-background)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-[var(--border-subtle)] flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isInviting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onInvite({ email, name: email.split('@')[0], teamRole: role, message: message || undefined })}
                        disabled={!email || isInviting}
                    >
                        {isInviting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            'Send Invitation'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
