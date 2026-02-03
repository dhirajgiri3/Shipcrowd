"use client";

import { useState } from "react";
import { Plus, Trash2, Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/core/Card";
import { Button } from "@/src/components/ui/core/Button";
import { Input } from "@/src/components/ui/core/Input";
import { Label } from "@/src/components/ui/core/Label";
import { Badge } from "@/src/components/ui/core/Badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/src/components/ui/feedback/Dialog";
import { useBankAccounts, useAddBankAccount, useDeleteBankAccount } from "@/src/core/api/hooks/seller/useBankAccounts";
import { useForm } from "react-hook-form";

interface BankAccountForm {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
}

export function BankAccountsClient() {
    const [isAddOpen, setIsAddOpen] = useState(false);

    // API Hooks
    const { data, isLoading } = useBankAccounts();
    const { mutate: addAccount, isPending: isAdding } = useAddBankAccount();
    const { mutate: deleteAccount, isPending: isDeleting } = useDeleteBankAccount();

    const accounts = data?.accounts || [];

    // Form
    const { register, handleSubmit, reset, formState: { errors } } = useForm<BankAccountForm>();

    const onSubmit = (data: BankAccountForm) => {
        addAccount(data, {
            onSuccess: () => {
                setIsAddOpen(false);
                reset();
            }
        });
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to remove this bank account?")) {
            deleteAccount(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Bank Accounts</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Manage your settlement bank accounts
                    </p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Bank Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Bank Account</DialogTitle>
                            <DialogDescription>
                                Enter your bank details for settlements.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                                <Input
                                    id="accountHolderName"
                                    {...register("accountHolderName", {
                                        required: "Account holder name is required",
                                        minLength: { value: 2, message: "Name must be at least 2 characters" }
                                    })}
                                    placeholder="e.g. John Doe"
                                />
                                {errors.accountHolderName && <span className="text-xs text-[var(--error)]">{errors.accountHolderName.message}</span>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bankName">Bank Name</Label>
                                <Input
                                    id="bankName"
                                    {...register("bankName", {
                                        required: "Bank name is required",
                                        minLength: { value: 2, message: "Bank name must be at least 2 characters" }
                                    })}
                                    placeholder="e.g. HDFC Bank"
                                />
                                {errors.bankName && <span className="text-xs text-[var(--error)]">{errors.bankName.message}</span>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="accountNumber">Account Number</Label>
                                <Input
                                    id="accountNumber"
                                    {...register("accountNumber", {
                                        required: "Account number is required",
                                        minLength: { value: 8, message: "Account number seems too short" }
                                    })}
                                    placeholder="e.g. 1234567890"
                                />
                                {errors.accountNumber && <span className="text-xs text-[var(--error)]">{errors.accountNumber.message}</span>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ifscCode">IFSC Code</Label>
                                <Input
                                    id="ifscCode"
                                    {...register("ifscCode", {
                                        required: "IFSC code is required",
                                        pattern: { value: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: "Invalid IFSC Code format" },
                                        minLength: { value: 11, message: "IFSC code must be 11 characters" },
                                        maxLength: { value: 11, message: "IFSC code must be 11 characters" }
                                    })}
                                    placeholder="e.g. HDFC0001234"
                                    className="uppercase"
                                    maxLength={11}
                                />
                                {errors.ifscCode && <span className="text-xs text-[var(--error)]">{errors.ifscCode.message}</span>}
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isAdding}>
                                    {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Account
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Account List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-[var(--primary-blue)]" />
                </div>
            ) : accounts.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                        <Building2 className="h-12 w-12 text-[var(--text-muted)] opacity-50 mb-4" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No Bank Accounts Added</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-sm">
                            Add a bank account to receive COD remittances and other settlements.
                        </p>
                        <Button variant="outline" onClick={() => setIsAddOpen(true)}>
                            Add Your First Account
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accounts.map((account: any) => (
                        <Card key={account._id || 'primary'} className="overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-[var(--primary-blue)]" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[var(--text-primary)]">{account.bankName}</h3>
                                            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                                {account.isVerified ? (
                                                    <span className="flex items-center text-[var(--success)]">
                                                        <CheckCircle className="h-3 w-3 mr-1" /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-[var(--warning)]">
                                                        <AlertCircle className="h-3 w-3 mr-1" /> Pending Verification
                                                    </span>
                                                )}
                                                {account.isDefault && (
                                                    <Badge variant="secondary" className="ml-2 text-[10px] h-5">Default</Badge>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-[var(--error)] hover:text-[var(--error-hover)] hover:bg-[var(--error-bg)]"
                                        onClick={() => handleDelete(account._id || 'primary')}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-secondary)]">Account Number</span>
                                        <span className="font-mono font-medium text-[var(--text-primary)]">
                                            •••• {account.accountNumber ? account.accountNumber.slice(-4) : '****'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-secondary)]">IFSC Code</span>
                                        <span className="font-mono font-medium text-[var(--text-primary)]">{account.ifscCode}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-secondary)]">Beneficiary</span>
                                        <span className="font-medium text-[var(--text-primary)]">{account.accountHolderName || 'Company Account'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
