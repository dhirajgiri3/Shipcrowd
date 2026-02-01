"use client";

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Label } from '@/src/components/ui/core/Label';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: LucideIcon;
    leftElement?: ReactNode;
    rightElement?: ReactNode;
    required?: boolean;
    optional?: boolean;
}

/**
 * FormField - Theme-aware form input with label, icon, and error support
 * 
 * Uses design system tokens from globals.css for consistent theming.
 * Supports both light and dark modes automatically.
 * 
 * @example
 * <FormField
 *   label="Warehouse Name"
 *   icon={Building2}
 *   placeholder="e.g. Mumbai Fulfillment Center"
 *   required
 * />
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
    ({
        label,
        error,
        hint,
        icon: Icon,
        leftElement,
        rightElement,
        className,
        id,
        required,
        optional,
        ...props
    }, ref) => {
        const inputId = id || props.name;

        return (
            <div className="w-full space-y-2.5">
                {/* Label */}
                {label && (
                    <Label
                        htmlFor={inputId}
                        className="text-sm font-semibold text-[var(--text-primary)] block mb-2.5"
                    >
                        {label}
                        {required && <span className="text-[var(--error)] ml-1">*</span>}
                        {optional && (
                            <span className="text-[var(--text-muted)] font-normal ml-2 text-xs">
                                (Optional)
                            </span>
                        )}
                    </Label>
                )}

                {/* Input Container */}
                <div className="relative">
                    {/* Left Icon */}
                    {Icon && (
                        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    )}

                    {/* Custom Left Element */}
                    {leftElement && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            {leftElement}
                        </div>
                    )}

                    {/* Input */}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            // Base styles
                            "w-full py-3 rounded-xl border bg-[var(--bg-tertiary)] text-[var(--text-primary)]",
                            "placeholder:text-[var(--text-muted)]",
                            "focus:ring-1 focus:ring-[var(--primary-blue)]/30 focus:border-[var(--primary-blue)]",
                            "outline-none transition-all",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--bg-secondary)]",
                            // Padding based on icons
                            Icon || leftElement ? "pl-12" : "px-4",
                            rightElement ? "pr-12" : Icon || leftElement ? "pr-4" : "",
                            // Border states
                            error
                                ? "border-[var(--error)] focus:ring-[var(--error)]/20"
                                : "border-[var(--border-default)]",
                            className
                        )}
                        {...props}
                    />

                    {/* Right Element */}
                    {rightElement && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {rightElement}
                        </div>
                    )}
                </div>

                {/* Hint Text */}
                {hint && !error && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                        {hint}
                    </p>
                )}

                {/* Error Message */}
                {error && (
                    <p className="text-sm text-[var(--error)] mt-1.5 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error)]" />
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

FormField.displayName = "FormField";
