"use client";

import { Badge } from '@/components/ui/core/Badge';
import { getStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
