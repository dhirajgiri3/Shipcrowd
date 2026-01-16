'use client';

import * as React from 'react';
import { cn } from '@/src/lib/utils';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
        return (
            <div className="relative inline-flex items-center">
                <input
                    type="checkbox"
                    className="peer sr-only"
                    ref={ref}
                    checked={checked}
                    onChange={(e) => onCheckedChange?.(e.target.checked)}
                    disabled={disabled}
                    {...props}
                />
                <div
                    className={cn(
                        "h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-background)]",
                        "bg-[var(--bg-tertiary)] border border-[var(--border-default)]",
                        "peer-checked:bg-[var(--primary-blue)] peer-checked:border-[var(--primary-blue)]",
                        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                        className
                    )}
                ></div>
                <div
                    className={cn(
                        "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ring-0",
                        "peer-checked:translate-x-5",
                        "peer-disabled:cursor-not-allowed"
                    )}
                ></div>
            </div>
        );
    }
);

Switch.displayName = 'Switch';

export { Switch };
