'use client';

import { Badge } from '@/src/components/ui/core/Badge';
import type { RTOReturnStatus } from '@/src/types/api/rto.types';
import { RTO_STATUS_LABELS } from '@/src/types/api/rto.types';

const STATUS_STYLES: Record<RTOReturnStatus, string> = {
    initiated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    in_transit: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    delivered_to_warehouse: 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300',
    qc_pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    qc_completed: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    restocked: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    disposed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

interface RTOStatusBadgeProps {
    status: RTOReturnStatus | string;
    size?: 'sm' | 'default' | 'large';
}

export function RTOStatusBadge({ status, size = 'default' }: RTOStatusBadgeProps) {
    const label = RTO_STATUS_LABELS[status as RTOReturnStatus] ?? status;
    const style = STATUS_STYLES[status as RTOReturnStatus] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0' : size === 'large' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';

    return (
        <Badge className={`${style} ${sizeClass} font-medium rounded-full`} variant="secondary">
            {label}
        </Badge>
    );
}
