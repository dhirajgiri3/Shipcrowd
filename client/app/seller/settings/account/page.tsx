"use client";

import { useState } from 'react';
import { authApi } from '@/src/core/api/auth.api';
import { useAuth } from '@/src/features/auth';
import { Button, Card } from '@/components/ui';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, UserX, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AccountManagementPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeactivate = async () => {
        const confirmed = confirm(
            'Are you sure you want to deactivate your account? You can reactivate it anytime by logging in again.'
        );
        if (!confirmed) return;

        const reason = prompt('Why are you deactivating? (optional)');

        setIsDeactivating(true);
        try {
            await authApi.deactivateAccount(reason || undefined);
            toast.success('Account deactivated successfully');
            await logout();
            router.push('/');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to deactivate account');
        } finally {
            setIsDeactivating(false);
        }
    };

    const handleScheduleDeletion = async () => {
        const confirmed = confirm(
            '⚠️ WARNING: This will schedule your account for permanent deletion in 30 days.\n\nYou can cancel within 30 days. After that, all your data will be permanently deleted.\n\nAre you absolutely sure?'
        );
        if (!confirmed) return;

        const reason = prompt('Why are you leaving? (optional - helps us improve)');

        setIsDeleting(true);
        try {
            const result = await authApi.scheduleAccountDeletion(reason || undefined);
            const deletionDate = new Date(result.data?.scheduledDeletionDate).toLocaleDateString();
            toast.success(`Account deletion scheduled for ${deletionDate}`);

            // Show info about cancellation
            setTimeout(() => {
                alert(`Your account will be deleted on ${deletionDate}.\n\nYou can cancel this by logging in before that date.`);
            }, 1000);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to schedule deletion');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <Link href="/seller/settings/profile">
                        <Button variant="ghost" className="gap-2 mb-4">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Settings
                        </Button>
                    </Link>

                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        Account Management
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Manage your account status and data
                    </p>
                </div>

                {/* Current Account Info */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        Account Information
                    </h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">Email:</span>
                            <span className="text-[var(--text-primary)] font-medium">{user?.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">Account Type:</span>
                            <span className="text-[var(--text-primary)] font-medium capitalize">{user?.role}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">Status:</span>
                            <span className="text-[var(--success)] font-medium">Active</span>
                        </div>
                    </div>
                </Card>

                {/* Danger Zone */}
                <Card className="p-6 border-[var(--error)] bg-[var(--error-bg)]">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-5 w-5 text-[var(--error)]" />
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                            Danger Zone
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* Deactivate Account */}
                        <div className="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)]">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserX className="h-5 w-5 text-[var(--warning)]" />
                                        <h3 className="font-semibold text-[var(--text-primary)]">
                                            Deactivate Account
                                        </h3>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Temporarily disable your account. You can reactivate anytime by logging in.
                                    </p>
                                    <ul className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
                                        <li>• Your data will be preserved</li>
                                        <li>• You can reactivate anytime</li>
                                        <li>• Your profile will be hidden</li>
                                    </ul>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleDeactivate}
                                    disabled={isDeactivating}
                                    isLoading={isDeactivating}
                                    className="border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--warning)] hover:text-white"
                                >
                                    {isDeactivating ? 'Deactivating...' : 'Deactivate'}
                                </Button>
                            </div>
                        </div>

                        {/* Delete Account */}
                        <div className="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--error)]">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trash2 className="h-5 w-5 text-[var(--error)]" />
                                        <h3 className="font-semibold text-[var(--text-primary)]">
                                            Delete Account
                                        </h3>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Permanently delete your account after a 30-day grace period.
                                    </p>
                                    <ul className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
                                        <li>• 30-day grace period to cancel</li>
                                        <li>• All data will be permanently deleted</li>
                                        <li>• This action cannot be undone after 30 days</li>
                                    </ul>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleScheduleDeletion}
                                    disabled={isDeleting}
                                    isLoading={isDeleting}
                                    className="border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)] hover:text-white"
                                >
                                    {isDeleting ? 'Scheduling...' : 'Delete Account'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Info Card */}
                <Card className="p-4 bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/20">
                    <p className="text-sm text-[var(--primary-blue)]">
                        <strong>Need help?</strong> Contact our support team before deleting your account.
                        We're here to help resolve any issues.
                    </p>
                </Card>
            </div>
        </div>
    );
}
