import React from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Eye, ExternalLink } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';

interface ViewActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onClick?: (e: React.MouseEvent) => void;
    showTooltip?: boolean;
    tooltipText?: string;
    variant?: 'ghost' | 'outline' | 'primary';
}

export function ViewActionButton({
    className,
    onClick,
    showTooltip = true,
    tooltipText = "View Details",
    variant = 'ghost',
    ...props
}: ViewActionButtonProps) {
    const button = (
        <Button
            variant={variant}
            size="sm"
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(e);
            }}
            className={cn(
                "h-8 px-2 text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] transition-colors",
                variant === 'primary' && "bg-[var(--primary-blue-soft)] text-[var(--text-primary)] hover:bg-[var(--primary-blue)] hover:text-white",
                className
            )}
            {...props}
        >
            <Eye size={16} />
            <span className="sr-only">View Details</span>
        </Button>
    );

    if (showTooltip) {
        return (
            <Tooltip content={tooltipText}>
                {button}
            </Tooltip>
        );
    }

    return button;
}
