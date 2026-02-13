import React from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Eye, ArrowUpRight, LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';

interface ViewActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onClick?: (e: React.MouseEvent) => void;
    showTooltip?: boolean;
    tooltipText?: string;
    variant?: 'ghost' | 'outline' | 'primary' | 'link';
    label?: string;
    icon?: LucideIcon;
}

export function ViewActionButton({
    className,
    onClick,
    showTooltip = true,
    tooltipText = "View Details",
    variant = 'ghost',
    label,
    icon,
    ...props
}: ViewActionButtonProps) {
    // If icon is explicitly provided, use it.
    // If not, and label is present, default to ArrowUpRight.
    // Otherwise default to Eye.
    const DisplayIcon = icon || (label ? ArrowUpRight : Eye);

    // If label is present, we act as a text button (link-style usually)
    const isTextButton = !!label;

    const button = (
        <Button
            variant={variant}
            size="sm"
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(e);
            }}
            className={cn(
                "h-8 px-2 transition-colors",
                // Icon-only styles
                !isTextButton && "text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)]",
                !isTextButton && variant === 'primary' && "bg-[var(--primary-blue-soft)] text-[var(--text-primary)] hover:bg-[var(--primary-blue)] hover:text-white",
                // Text button styles (matching Orders page)
                isTextButton && "text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] hover:bg-transparent font-medium text-sm flex items-center gap-1 p-0 h-auto",
                className
            )}
            {...props}
        >
            {isTextButton && <span>{label}</span>}
            <DisplayIcon size={16} className={cn(isTextButton && "w-4 h-4")} />
            {!isTextButton && <span className="sr-only">View Details</span>}
        </Button>
    );

    if (showTooltip && !isTextButton) {
        return (
            <Tooltip content={tooltipText}>
                {button}
            </Tooltip>
        );
    }

    return button;
}
