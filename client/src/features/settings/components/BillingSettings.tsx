"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { CreditCard, Building, AlertCircle, CheckCircle } from 'lucide-react';
import { useBankAccounts } from '@/src/core/api/hooks/seller/useBankAccounts';

export function BillingSettings() {
    const { data, isLoading, isError } = useBankAccounts();
    const accounts = data?.accounts ?? [];
    const bankAccount = accounts.find((a) => a.isDefault) ?? accounts[0];

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                        <Loader variant="spinner" size="lg" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardContent className="py-6">
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>Failed to load bank accounts. Please try again later.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Bank Accounts</CardTitle>
                    <CardDescription>Manage your bank accounts for COD remittances.</CardDescription>
                </div>
                <Link href="/seller/bank-accounts">
                    <Button variant="outline" size="sm">
                        {bankAccount ? 'Manage' : 'Add Account'}
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                {!bankAccount ? (
                    <div className="text-center py-12 rounded-xl border-2 border-dashed border-[var(--border-subtle)]">
                        <CreditCard className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No Bank Accounts</h3>
                        <p className="text-[var(--text-muted)] mb-4">Add a bank account to receive COD payments.</p>
                        <Link href="/seller/bank-accounts">
                            <Button variant="outline">Add Bank Account</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-[var(--primary-blue-soft)]">
                                <Building className="w-6 h-6 text-[var(--primary-blue)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-[var(--text-primary)]">{bankAccount.bankName || 'Bank Account'}</h4>
                                    {bankAccount.verificationStatus === 'verified' ? (
                                        <Badge variant="success" className="text-[10px] px-1.5 py-0.5 h-5">
                                            <CheckCircle className="w-3 h-3 mr-1" /> Verified
                                        </Badge>
                                    ) : (
                                        <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 h-5">Unverified</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mt-0.5 font-mono">
                                    {bankAccount.maskedAccountNumber}
                                </p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    {bankAccount.accountHolderName} • {bankAccount.ifscCode}
                                </p>
                            </div>
                        </div>
                        <Link href="/seller/bank-accounts" className="mt-4">
                            <Button variant="ghost" size="sm" className="text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)]">
                                Manage Bank Account
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
