"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { Loader } from '@/src/components/ui/feedback/Loader';
import {
    CreditCard,
    Plus,
    Trash2,
    CheckCircle2,
    Building,
    AlertCircle
} from 'lucide-react';
import { useBankAccounts, useAddBankAccount, useDeleteBankAccount, useSetDefaultBankAccount } from '@/src/core/api/hooks/seller/useBankAccounts';

export function BillingSettings() {
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState({
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: ''
    });

    const { addToast } = useToast();

    // Hooks
    const { data: accounts, isLoading, isError } = useBankAccounts();
    const addAccountMutation = useAddBankAccount();
    const deleteAccountMutation = useDeleteBankAccount();
    const setDefaultMutation = useSetDefaultBankAccount();

    const handleAddAccount = () => {
        if (!form.bankName || !form.accountNumber || !form.ifscCode || !form.accountHolderName) {
            addToast('Please fill all fields', 'warning');
            return;
        }

        addAccountMutation.mutate(form, {
            onSuccess: () => {
                addToast('Bank account added successfully', 'success');
                setIsAdding(false);
                setForm({ bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '' });
            },
            onError: (error: any) => {
                addToast(error?.response?.data?.message || 'Failed to add bank account', 'error');
            }
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to remove this bank account?')) {
            deleteAccountMutation.mutate(id, {
                onSuccess: () => addToast('Bank account removed', 'success'),
                onError: () => addToast('Failed to remove account', 'error')
            });
        }
    };

    const handleSetDefault = (id: string) => {
        setDefaultMutation.mutate(id, {
            onSuccess: () => addToast('Default account updated', 'success'),
            onError: () => addToast('Failed to update default account', 'error')
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader variant="spinner" size="lg" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <p>Failed to load bank accounts. Please try again later.</p>
            </div>
        );
    }

    const bankAccounts = accounts?.accounts || [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Bank Accounts</CardTitle>
                    <CardDescription>Manage your bank accounts for COD remittances.</CardDescription>
                </div>
                {!isAdding && (
                    <Button onClick={() => setIsAdding(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Account
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Add New Account Form */}
                {isAdding && (
                    <div className="p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4 animate-in slide-in-from-top-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-[var(--text-primary)]">Add New Bank Account</h3>
                            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-[var(--text-primary)] block mb-1.5">Bank Name</label>
                                <Input
                                    value={form.bankName}
                                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                                    placeholder="Enter bank name"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[var(--text-primary)] block mb-1.5">Account Holder Name</label>
                                <Input
                                    value={form.accountHolderName}
                                    onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                                    placeholder="Enter account holder name"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[var(--text-primary)] block mb-1.5">Account Number</label>
                                <Input
                                    value={form.accountNumber}
                                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                                    placeholder="Enter account number"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-[var(--text-primary)] block mb-1.5">IFSC Code</label>
                                <Input
                                    value={form.ifscCode}
                                    onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                                    placeholder="Enter IFSC code"
                                    className="uppercase"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleAddAccount} isLoading={addAccountMutation.isPending}>
                                Save Account
                            </Button>
                        </div>
                    </div>
                )}

                {/* Accounts List */}
                <div className="space-y-4">
                    {bankAccounts.length === 0 && !isAdding ? (
                        <div className="text-center py-12 rounded-xl border-2 border-dashed border-[var(--border-subtle)]">
                            <CreditCard className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                            <h3 className="text-lg font-medium text-[var(--text-primary)]">No Bank Accounts</h3>
                            <p className="text-[var(--text-muted)] mb-4">Add a bank account to receive COD payments.</p>
                            <Button onClick={() => setIsAdding(true)} variant="outline">
                                Add Bank Account
                            </Button>
                        </div>
                    ) : (
                        bankAccounts.map((account) => (
                            <div
                                key={account._id}
                                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all ${account.isDefault
                                    ? 'bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/30'
                                    : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-[var(--border-primary)]'
                                    }`}
                            >
                                <div className="flex items-start gap-4 mb-4 sm:mb-0">
                                    <div className={`p-3 rounded-lg ${account.isDefault ? 'bg-[var(--primary-blue)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                                        }`}>
                                        <Building className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-[var(--text-primary)]">{account.bankName || 'Bank Account'}</h4>
                                            {account.isDefault && (
                                                <Badge variant="success" className="text-[10px] px-1.5 py-0.5 h-5">Default</Badge>
                                            )}
                                            {!account.isVerified && (
                                                <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 h-5">Unverified</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] mt-0.5 font-mono">
                                            XXXX-XXXX-{account.accountNumber.slice(-4)}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            {account.accountHolderName} • {account.ifscCode}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    {!account.isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSetDefault(account._id)}
                                            isLoading={setDefaultMutation.isPending}
                                            className="text-[var(--text-muted)] hover:text-[var(--primary-blue)]"
                                        >
                                            Set Default
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(account._id)}
                                        isLoading={deleteAccountMutation.isPending}
                                        className="text-[var(--error)] hover:bg-[var(--error-bg)]"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
