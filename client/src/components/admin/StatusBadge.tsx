"use client";

import { Badge } from '@/src/components/ui/core/Badge';
import { getStatusColor } from '@/src/lib/utils';
import { cn } from '@/src/lib/utils';

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const colorClass = getStatusColor(status);

    return (
        <Badge variant="outline" className={cn("capitalize whitespace-nowrap", colorClass, className)}>
            {status.replace('-', ' ')}
        </Badge>
    );
}
