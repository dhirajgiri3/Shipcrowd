/**
 * Status Badge Component
 * 
 * Reusable badge component for displaying status with color coding.
 * Used across wallet, COD remittance, disputes, etc.
 */

import React from 'react';
import { cn } from '@/src/lib/utils';

export type BadgeVariant =
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'pending'
    | 'processing'
    | 'default';

interface StatusBadgeProps {
    status: string;
    variant?: BadgeVariant;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

/**
 * Auto-detect variant based on common status keywords
 */
function getVariantFromStatus(status: string): BadgeVariant {
    const statusLower = status.toLowerCase().replace(/_/g, ' ');

    if (statusLower.includes('completed') || statusLower.includes('approved') || statusLower.includes('paid') || statusLower.includes('delivered')) {
        return 'success';
    }
    if (statusLower.includes('pending') || statusLower.includes('awaiting')) {
        return 'pending';
    }
    if (statusLower.includes('processing') || statusLower.includes('initiated')) {
        return 'processing';
    }
    if (statusLower.includes('failed') || statusLower.includes('cancelled') || statusLower.includes('rejected')) {
        return 'error';
    }
    if (statusLower.includes('warning') || statusLower.includes('disputed')) {
        return 'warning';
    }

    return 'default';
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
    const badgeVariant = variant || getVariantFromStatus(status);

    // Format status text: pending_approval -> Pending Approval
    const formattedStatus = status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                variantStyles[badgeVariant],
                className
            )}
        >
            {formattedStatus}
        </span>
    );
}
