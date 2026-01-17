/**
 * Document Preview Components for KYC
 * Reusable components to display KYC document details and verification status
 */

import { CheckCircle2, XCircle, Clock, AlertCircle, FileText, Building2, CreditCard } from "lucide-react"
import { cn } from "@/src/lib/utils"

// ========================================================================
// STATUS BADGE
// ========================================================================

interface StatusBadgeProps {
    status: 'verified' | 'pending' | 'rejected' | 'not_submitted'
    className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = {
        verified: {
            icon: CheckCircle2,
            label: 'Verified',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800'
        },
        pending: {
            icon: Clock,
            label: 'Pending',
            className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800'
        },
        rejected: {
            icon: XCircle,
            label: 'Rejected',
            className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800'
        },
        not_submitted: {
            icon: AlertCircle,
            label: 'Not Submitted',
            className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800'
        }
    }

    const { icon: Icon, label, className: statusClassName } = config[status]

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
            statusClassName,
            className
        )}>
            <Icon className="w-3.5 h-3.5" />
            {label}
        </span>
    )
}

// ========================================================================
// PAN CARD PREVIEW
// ========================================================================

interface PANCardPreviewProps {
    panNumber: string
    name?: string
    status: 'verified' | 'pending' | 'rejected' | 'not_submitted'
    verifiedOn?: string
    className?: string
}

export function PANCardPreview({ panNumber, name, status, verifiedOn, className }: PANCardPreviewProps) {
    const isVerified = status === 'verified'

    return (
        <div className={cn(
            "p-6 rounded-lg border bg-white dark:bg-gray-950",
            isVerified ? "border-emerald-200 dark:border-emerald-800" : "border-gray-200 dark:border-gray-800",
            className
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primaryBlue/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primaryBlue" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">PAN Card</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Permanent Account Number</p>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">PAN Number</p>
                        <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white tracking-wider">
                            {panNumber}
                        </p>
                    </div>
                    {name && (
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name on PAN</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {name}
                            </p>
                        </div>
                    )}
                </div>

                {verifiedOn && isVerified && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Verified on {new Date(verifiedOn).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ========================================================================
// AADHAAR CARD PREVIEW
// ========================================================================

interface AadhaarCardPreviewProps {
    aadhaarNumber: string
    name?: string
    status: 'verified' | 'pending' | 'rejected' | 'not_submitted'
    verifiedOn?: string
    className?: string
}

export function AadhaarCardPreview({ aadhaarNumber, name, status, verifiedOn, className }: AadhaarCardPreviewProps) {
    const isVerified = status === 'verified'

    // Mask Aadhaar number (show only last 4 digits)
    const maskedAadhaar = `XXXX XXXX ${aadhaarNumber.slice(-4)}`

    return (
        <div className={cn(
            "p-6 rounded-lg border bg-white dark:bg-gray-950",
            isVerified ? "border-emerald-200 dark:border-emerald-800" : "border-gray-200 dark:border-gray-800",
            className
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primaryBlue/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primaryBlue" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Aadhaar Card</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Unique Identification Number</p>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aadhaar Number</p>
                        <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white tracking-wider">
                            {maskedAadhaar}
                        </p>
                    </div>
                    {name && (
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name on Aadhaar</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {name}
                            </p>
                        </div>
                    )}
                </div>

                {verifiedOn && isVerified && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Verified on {new Date(verifiedOn).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ========================================================================
// GSTIN PREVIEW
// ========================================================================

interface GSTINPreviewProps {
    gstin: string
    businessName?: string
    status: 'verified' | 'pending' | 'rejected' | 'not_submitted'
    verifiedOn?: string
    className?: string
}

export function GSTINPreview({ gstin, businessName, status, verifiedOn, className }: GSTINPreviewProps) {
    const isVerified = status === 'verified'

    return (
        <div className={cn(
            "p-6 rounded-lg border bg-white dark:bg-gray-950",
            isVerified ? "border-emerald-200 dark:border-emerald-800" : "border-gray-200 dark:border-gray-800",
            className
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primaryBlue/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primaryBlue" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">GSTIN</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Goods and Services Tax Identification</p>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">GSTIN</p>
                        <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white tracking-wider">
                            {gstin}
                        </p>
                    </div>
                    {businessName && (
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Business Name</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {businessName}
                            </p>
                        </div>
                    )}
                </div>

                {verifiedOn && isVerified && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Verified on {new Date(verifiedOn).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ========================================================================
// BANK ACCOUNT PREVIEW
// ========================================================================

interface BankAccountPreviewProps {
    accountNumber: string
    ifscCode: string
    accountHolderName?: string
    bankName?: string
    status: 'verified' | 'pending' | 'rejected' | 'not_submitted'
    verifiedOn?: string
    className?: string
}

export function BankAccountPreview({
    accountNumber,
    ifscCode,
    accountHolderName,
    bankName,
    status,
    verifiedOn,
    className
}: BankAccountPreviewProps) {
    const isVerified = status === 'verified'

    // Mask account number (show only last 4 digits)
    const maskedAccountNumber = `XXXX XXXX ${accountNumber.slice(-4)}`

    return (
        <div className={cn(
            "p-6 rounded-lg border bg-white dark:bg-gray-950",
            isVerified ? "border-emerald-200 dark:border-emerald-800" : "border-gray-200 dark:border-gray-800",
            className
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primaryBlue/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primaryBlue" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bank Account</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Payment & Settlement Details</p>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Account Number</p>
                        <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white tracking-wider">
                            {maskedAccountNumber}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">IFSC Code</p>
                        <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white tracking-wider">
                            {ifscCode}
                        </p>
                    </div>
                </div>

                {(accountHolderName || bankName) && (
                    <div className="grid grid-cols-2 gap-3">
                        {accountHolderName && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Account Holder</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {accountHolderName}
                                </p>
                            </div>
                        )}
                        {bankName && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bank Name</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {bankName}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {verifiedOn && isVerified && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Verified on {new Date(verifiedOn).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
