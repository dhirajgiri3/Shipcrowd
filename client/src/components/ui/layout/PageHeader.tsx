/**
 * PageHeader Component
 * 
 * Standard header for all pages with title, description and optional actions.
 */

import { cn } from '@/src/lib/utils';
import React from 'react';

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function PageHeader({
    title,
    description,
    action,
    className,
    ...props
}: PageHeaderProps) {
    return (
        <div
            className={cn("flex flex-col gap-1 md:flex-row md:items-center md:justify-between py-2", className)}
            {...props}
        >
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-[var(--text-muted)]">
                        {description}
                    </p>
                )}
            </div>
            {action && (
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    {action}
                </div>
            )}
        </div>
    );
}
