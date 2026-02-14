"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Building2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/core/Card";
import { Button } from "@/src/components/ui/core/Button";
import { Input } from "@/src/components/ui/core/Input";
import { Label } from "@/src/components/ui/core/Label";
import { Badge } from "@/src/components/ui/core/Badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/src/components/ui/feedback/Dialog";
import { Alert, AlertDescription } from "@/src/components/ui/feedback/Alert";
import { EmptyState } from "@/src/components/ui/feedback/EmptyState";
import { PageHeader } from "@/src/components/ui/layout/PageHeader";
import { Skeleton } from "@/src/components/ui/data/Skeleton";
import { ConfirmDialog } from "@/src/components/ui/feedback/ConfirmDialog";
import { Tooltip } from "@/src/components/ui/feedback/Tooltip";
import { useBankAccounts, useAddBankAccount, useDeleteBankAccount } from "@/src/core/api/hooks/seller/useBankAccounts";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/src/core/api/config/query-keys";
import { useForm } from "react-hook-form";
import { kycApi } from "@/src/core/api/clients/auth/kycApi";
import { showSuccessToast, handleApiError } from "@/src/lib/error";

interface BankAccountForm {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
}

const formatIFSC = (value: string) => value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 11);

export function BankAccountsClient() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [ifscLookupLoading, setIfscLookupLoading] = useState(false);

    const queryClient = useQueryClient();

    // API Hooks
    const { data, isLoading } = useBankAccounts();
    const { mutate: addAccount, isPending: isAdding } = useAddBankAccount();
    const { mutate: deleteAccount, isPending: isDeleting } = useDeleteBankAccount();

    const accounts = data?.data?.accounts ?? data?.accounts ?? [];

    // Form
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BankAccountForm>();

    const handleVerifyAndAdd = useCallback(async (formData: BankAccountForm) => {
        setVerificationError(null);
        setVerificationStatus('verifying');
        try {
            const response = await kycApi.verifyBankAccount({
                accountNumber: formData.accountNumber,
                ifsc: formData.ifscCode,
                accountHolderName: formData.accountHolderName,
            });
            const verified = response?.data?.verified ?? response?.verified ?? false;
            if (verified) {
                setVerificationStatus('verified');
                showSuccessToast('Bank account verified and saved successfully');
                queryClient.invalidateQueries({ queryKey: queryKeys.seller.bankAccounts() });
                setIsAddOpen(false);
                reset();
                setVerificationStatus('idle');
            } else {
                setVerificationStatus('failed');
                setVerificationError(response?.data?.message || response?.message || 'Verification failed');
            }
        } catch (err: any) {
            setVerificationStatus('failed');
            handleApiError(err, 'Bank account verification failed');
            setVerificationError(err?.message || 'Verification failed');
        }
    }, [queryClient, reset]);

    const handleIfscBlur = useCallback(async () => {
        const ifsc = watch('ifscCode');
        if (!ifsc || ifsc.length !== 11) return;
        setIfscLookupLoading(true);
        try {
            const response = await kycApi.verifyIFSC(ifsc);
            const bankName = response?.data?.bankName || response?.data?.bank || '';
            if (bankName) setValue('bankName', bankName);
        } catch {
            // Ignore - user can enter manually
        } finally {
            setIfscLookupLoading(false);
        }
    }, [watch, setValue]);

    const onSubmit = (formData: BankAccountForm) => {
        addAccount(formData, {
            onSuccess: () => {
                setIsAddOpen(false);
                reset();
                setVerificationStatus('idle');
                setVerificationError(null);
            }
        });
    };

    const handleDialogOpenChange = (open: boolean) => {
        setIsAddOpen(open);
        if (!open) {
            setVerificationStatus('idle');
            setVerificationError(null);
            reset();
        }
    };

    const handleDelete = (id: string) => {
        setDeleteTarget(id);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bank Accounts"
                description="Manage your settlement bank accounts"
                showBack={false}
                actions={
                    <Dialog open={isAddOpen} onOpenChange={handleDialogOpenChange}>
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
                                Enter your bank details and verify to receive COD remittances and settlements.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit((formData) => handleVerifyAndAdd(formData))} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="accountHolderName">Account Holder Name <span className="text-[var(--error)]">*</span></Label>
                                <Input
                                    id="accountHolderName"
                                    {...register("accountHolderName", {
                                        required: "Account holder name is required",
                                        minLength: { value: 2, message: "Name must be at least 2 characters" }
                                    })}
                                    placeholder="e.g. John Doe"
                                    disabled={verificationStatus === 'verifying'}
                                />
                                {errors.accountHolderName && <span className="text-xs text-[var(--error)]">{errors.accountHolderName.message}</span>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="accountNumber">Account Number <span className="text-[var(--error)]">*</span></Label>
                                <Input
                                    id="accountNumber"
                                    type="password"
                                    {...register("accountNumber", {
                                        required: "Account number is required",
                                        minLength: { value: 9, message: "Account number must be 9-18 digits" },
                                        maxLength: { value: 18, message: "Account number must be 9-18 digits" },
                                        pattern: { value: /^\d{9,18}$/, message: "Account number must be 9-18 digits" }
                                    })}
                                    placeholder="e.g. 1234567890"
                                    disabled={verificationStatus === 'verifying'}
                                />
                                {errors.accountNumber && <span className="text-xs text-[var(--error)]">{errors.accountNumber.message}</span>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ifscCode">IFSC Code <span className="text-[var(--error)]">*</span></Label>
                                    <Input
                                        id="ifscCode"
                                        {...register("ifscCode", {
                                            required: "IFSC code is required",
                                            pattern: { value: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: "Invalid IFSC format (e.g. HDFC0001234)" },
                                            minLength: { value: 11, message: "IFSC must be 11 characters" },
                                            maxLength: { value: 11, message: "IFSC must be 11 characters" }
                                        })}
                                        onChange={(e) => setValue('ifscCode', formatIFSC(e.target.value))}
                                        placeholder="e.g. HDFC0001234"
                                        className="uppercase font-mono"
                                        maxLength={11}
                                        onBlur={handleIfscBlur}
                                        disabled={verificationStatus === 'verifying'}
                                    />
                                    {errors.ifscCode && <span className="text-xs text-[var(--error)]">{errors.ifscCode.message}</span>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bankName">Bank Name</Label>
                                    <Input
                                        id="bankName"
                                        {...register("bankName", {
                                            required: "Bank name is required",
                                            minLength: { value: 2, message: "Bank name is required" }
                                        })}
                                        placeholder={ifscLookupLoading ? "Looking up..." : "Auto-filled from IFSC"}
                                        disabled={verificationStatus === 'verifying' || ifscLookupLoading}
                                        className="bg-[var(--bg-tertiary)]"
                                    />
                                    {errors.bankName && <span className="text-xs text-[var(--error)]">{errors.bankName.message}</span>}
                                </div>
                            </div>

                            {verificationStatus === 'verified' && (
                                <Alert variant="success">
                                    <AlertDescription>Account verified and saved</AlertDescription>
                                </Alert>
                            )}
                            {verificationError && (
                                <Alert variant="error">
                                    <AlertDescription>{verificationError}</AlertDescription>
                                </Alert>
                            )}

                            <DialogFooter className="gap-2 sm:gap-0 mt-6">
                                <Button type="button" variant="ghost" onClick={() => handleDialogOpenChange(false)}>Cancel</Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isAdding || verificationStatus === 'verifying'}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSubmit(onSubmit)(e);
                                    }}
                                >
                                    {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Without Verification
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isAdding || verificationStatus === 'verifying'}
                                >
                                    {(isAdding || verificationStatus === 'verifying') && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {verificationStatus === 'verifying' ? 'Verifying...' : 'Verify & Add Account'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                }
            />

            {/* Account List */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </div>
                                <div className="mt-6 space-y-3">
                                    {[1, 2, 3].map((j) => (
                                        <div key={j} className="flex justify-between">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : accounts.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="p-0">
                        <EmptyState
                            variant="noItems"
                            icon={<Building2 className="w-12 h-12" />}
                            title="No Bank Accounts Added"
                            description="Add a bank account to receive COD remittances and other settlements."
                            action={{
                                label: 'Add Your First Account',
                                onClick: () => setIsAddOpen(true),
                                variant: 'outline',
                                icon: <Plus className="w-4 h-4" />,
                            }}
                        />
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
                                    <Tooltip content="Remove account">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-[var(--error)] hover:text-[var(--error-hover)] hover:bg-[var(--error-bg)]"
                                            onClick={() => handleDelete(account._id || 'primary')}
                                            disabled={isDeleting}
                                            aria-label="Remove bank account"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </Tooltip>
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

            <ConfirmDialog
                open={!!deleteTarget}
                title="Remove bank account"
                description="Are you sure you want to remove this bank account? You will need to add it again to receive settlements."
                confirmText="Remove"
                cancelText="Cancel"
                confirmVariant="danger"
                isLoading={isDeleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (!deleteTarget) return;
                    deleteAccount(deleteTarget, {
                        onSuccess: () => setDeleteTarget(null),
                    });
                }}
            />
        </div>
    );
}
