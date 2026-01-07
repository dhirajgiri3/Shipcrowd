"use client";

import { useState, FormEvent } from 'react';
import { authApi } from '@/src/core/api/auth.api';
import { Button, Input, Card } from '@/components/ui';
import { toast } from 'sonner';
import { Unlock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AccountRecoveryPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await authApi.requestAccountRecovery(email);
            setSent(true);
            toast.success('Recovery email sent!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send recovery email');
        } finally {
            setIsLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
                <Card className="w-full max-w-md p-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-[var(--primary-blue-soft)] rounded-full flex items-center justify-center">
                        <Unlock className="h-8 w-8 text-[var(--primary-blue)]" />
                    </div>

                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        Check Your Email
                    </h1>

                    <p className="text-[var(--text-secondary)]">
                        We sent account recovery instructions to <strong>{email}</strong>
                    </p>

                    <p className="text-sm text-[var(--text-secondary)]">
                        Click the link in your email to unlock your account.
                    </p>

                    <div className="pt-4">
                        <Link href="/login">
                            <Button variant="ghost" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Login
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
            <Card className="w-full max-w-md p-8">
                <div className="space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            Account Locked?
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-2">
                            We'll send you an email to unlock your account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Email Address
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                            isLoading={isLoading}
                        >
                            {isLoading ? 'Sending...' : 'Send Recovery Email'}
                        </Button>
                    </form>

                    <div className="text-center space-y-2">
                        <Link href="/login" className="text-sm text-[var(--primary-blue)] hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}
