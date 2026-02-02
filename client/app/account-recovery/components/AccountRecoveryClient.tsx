"use client";

import { FormEvent } from 'react';
import { Button, Input, Card } from '@/src/components/ui';
import { Unlock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAccountRecovery } from '@/src/core/api/hooks/auth/useAccountRecovery';

export function AccountRecoveryClient() {
    const {
        email,
        handleEmailChange,
        isLoading,
        sent,
        error,
        submitRequest,
        resetForm
    } = useAccountRecovery();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await submitRequest();
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4 transition-colors duration-200">
                <Card className="w-full max-w-md p-8 text-center space-y-6 shadow-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                    <div className="mx-auto w-20 h-20 bg-[var(--primary-blue-soft)] rounded-full flex items-center justify-center animate-fade-in">
                        <Unlock className="h-10 w-10 text-[var(--primary-blue)]" />
                    </div>

                    <div className="space-y-2 animate-slide-up stagger-1">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                            Check Your Email
                        </h1>
                        <p className="text-[var(--text-secondary)] text-lg">
                            We sent instructions to <br />
                            <span className="font-semibold text-[var(--text-primary)]">{email}</span>
                        </p>
                    </div>

                    <p className="text-sm text-[var(--text-muted)] animate-slide-up stagger-2">
                        Click the link in your email to unlock your account.
                    </p>

                    <div className="pt-2 animate-slide-up stagger-3">
                        <Link href="/login">
                            <Button variant="ghost" className="gap-2 hover:bg-[var(--bg-secondary)] transition-all">
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
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4 transition-colors duration-200">
            <Card className="w-full max-w-md p-8 shadow-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <div className="space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            Account Locked?
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Enter your email to receive unlock instructions.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-[var(--text-primary)]"
                            >
                                Email Address
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => handleEmailChange(e.target.value)}
                                placeholder="name@company.com"
                                required
                                disabled={isLoading}
                                autoFocus
                                className="h-12 bg-[var(--bg-tertiary)] border-[var(--border-default)] focus:border-[var(--primary-blue)] transition-all"
                            />
                            {error && (
                                <p className="text-sm text-[var(--error)] animate-shake">
                                    {error}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-medium shadow-brand-sm hover:shadow-brand transition-all"
                            disabled={isLoading || !email}
                            isLoading={isLoading}
                        >
                            {isLoading ? 'Sending Instructions...' : 'Send Recovery Email'}
                        </Button>
                    </form>

                    <div className="text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors"
                        >
                            <ArrowLeft className="h-3 w-3" />
                            Return to Login
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}
