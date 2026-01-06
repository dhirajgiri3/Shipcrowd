"use client";

import { useState } from 'react';
import { useAuth } from '@/src/features/auth';
import { Button, Input, Card } from '@/components/ui';
import { toast } from 'sonner';
import { Mail, ShieldCheck, Key, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AccountSettingsPage() {
    const { user, changeEmail } = useAuth();

    // Email change state
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);

    // Account deletion state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newEmail || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        if (newEmail === user?.email) {
            toast.error('New email is the same as current email');
            return;
        }

        setIsChangingEmail(true);
        try {
            const result = await changeEmail({ newEmail, password });

            if (result.success) {
                toast.success(result.message || 'Verification email sent to new address');
                setNewEmail('');
                setPassword('');
                setShowEmailForm(false);
            } else {
                toast.error(result.error || 'Failed to change email');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to change email');
        } finally {
            setIsChangingEmail(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            toast.error('Please type DELETE to confirm');
            return;
        }

        toast.error('Account deletion not yet implemented');
        // TODO: Implement account deletion API call
        setShowDeleteConfirm(false);
        setDeleteConfirmText('');
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Account Settings</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Manage your email, recovery options, and account preferences
                </p>
            </div>

            {/* Email Management */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[var(--primary-blue-soft)] rounded-lg">
                        <Mail className="h-5 w-5 text-[var(--primary-blue)]" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Email Address</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Update your email address for login and notifications
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Current Email */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Current Email</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">{user?.email}</p>
                            {user?.isEmailVerified && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-[var(--success)]">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Verified
                                </div>
                            )}
                        </div>
                        {!showEmailForm && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowEmailForm(true)}
                            >
                                Change Email
                            </Button>
                        )}
                    </div>

                    {/* Change Email Form */}
                    {showEmailForm && (
                        <form onSubmit={handleChangeEmail} className="space-y-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    New Email Address
                                </label>
                                <Input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="Enter your new email"
                                    required
                                    disabled={isChangingEmail}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Confirm Password
                                </label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password to confirm"
                                    required
                                    disabled={isChangingEmail}
                                />
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-[var(--primary-blue-soft)] rounded-lg border border-[var(--primary-blue)]/20">
                                <AlertTriangle className="h-4 w-4 text-[var(--primary-blue)] flex-shrink-0" />
                                <p className="text-xs text-[var(--primary-blue)]">
                                    We'll send a verification link to your new email address. You must verify it before the change takes effect.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="submit"
                                    disabled={isChangingEmail}
                                    isLoading={isChangingEmail}
                                    size="sm"
                                >
                                    Send Verification Email
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowEmailForm(false);
                                        setNewEmail('');
                                        setPassword('');
                                    }}
                                    disabled={isChangingEmail}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </Card>

            {/* Account Recovery - Placeholder */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[var(--success-bg)] rounded-lg">
                        <ShieldCheck className="h-5 w-5 text-[var(--success)]" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Account Recovery</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Set up recovery options to regain access if you forget your password
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Security Questions - Coming Soon */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
                        <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-[var(--text-secondary)]" />
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">Security Questions</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">Not configured</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                            Coming Soon
                        </Button>
                    </div>

                    {/* Backup Email - Coming Soon */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-[var(--text-secondary)]" />
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">Backup Email</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">Not configured</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                            Coming Soon
                        </Button>
                    </div>

                    {/* Recovery Keys - Coming Soon */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
                        <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-[var(--text-secondary)]" />
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">Recovery Keys</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">Not generated</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                            Coming Soon
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-6 border-[var(--error)]/20 bg-[var(--error-bg)]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[var(--error)]/10 rounded-lg">
                        <Trash2 className="h-5 w-5 text-[var(--error)]" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Danger Zone</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Irreversible actions for your account
                        </p>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--error)]/20">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Delete Account</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                                Permanently delete your account and all associated data
                            </p>
                        </div>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            Delete Account
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--error)]/20">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-[var(--error)] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-[var(--error)]">Warning: This action cannot be undone</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    Deleting your account will permanently remove all your data, including:
                                </p>
                                <ul className="text-xs text-[var(--text-secondary)] mt-2 space-y-1 ml-4">
                                    <li>• All your orders and shipments</li>
                                    <li>• Company information and team members</li>
                                    <li>• Billing and payment history</li>
                                    <li>• KYC documents and verification data</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Type <span className="font-mono bg-[var(--error)]/10 px-1 py-0.5 rounded text-[var(--error)]">DELETE</span> to confirm
                            </label>
                            <Input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE to confirm"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE'}
                            >
                                Permanently Delete Account
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteConfirmText('');
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Account Info */}
            <Card className="p-6 bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/20">
                <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[var(--primary-blue)] flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                            Account Information
                        </p>
                        <div className="text-xs text-[var(--text-secondary)] space-y-1">
                            <p>• Your account was created on {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : 'N/A'}</p>
                            <p>• Your email is {user?.isEmailVerified ? 'verified' : 'not verified'}</p>
                            <p>• Your account status is {user?.isActive ? 'active' : 'inactive'}</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
