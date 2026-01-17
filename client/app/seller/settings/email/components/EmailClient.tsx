"use client";

import { useState, FormEvent } from 'react';
import { useAuth } from '@/src/features/auth';
import { Button, Input, Card } from '@/src/components/ui';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function EmailClient() {
    const { user, changeEmail, isLoading } = useAuth();
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');

    const isOAuth = user?.oauthProvider !== 'email';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const result = await changeEmail({
            newEmail,
            password: isOAuth ? undefined : password
        });

        if (result.success) {
            setNewEmail('');
            setPassword('');
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
                        Change Email Address
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Update your email address. You'll need to verify the new email.
                    </p>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Current Email
                            </label>
                            <Input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="bg-[var(--bg-secondary)]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                New Email Address
                            </label>
                            <Input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="your.new.email@example.com"
                                required
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>

                        {!isOAuth && (
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Current Password
                                </label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your current password"
                                    required
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    Required to verify it's you
                                </p>
                            </div>
                        )}

                        {isOAuth && (
                            <div className="p-3 bg-[var(--primary-blue-soft)] rounded-lg">
                                <p className="text-sm text-[var(--primary-blue)]">
                                    ℹ️ You signed up with {user?.oauthProvider || 'OAuth'}. No password required.
                                </p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading || !newEmail || (!isOAuth && !password)}
                            isLoading={isLoading}
                        >
                            {isLoading ? 'Sending Verification...' : 'Change Email'}
                        </Button>

                        <p className="text-xs text-[var(--text-secondary)] text-center">
                            A verification email will be sent to your new address
                        </p>
                    </form>
                </Card>
            </div>
        </div>
    );
}
