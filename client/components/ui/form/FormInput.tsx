"use client"

import { forwardRef, InputHTMLAttributes } from "react"
import { LucideIcon } from "lucide-react"
import React from 'react';
import { cn } from '@/src/shared/utils';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: LucideIcon;
    rightElement?: React.ReactNode;
}

/**
 * FormInput - Styled input with label, icon, and error support
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
    ({ label, error, icon: Icon, rightElement, className, id, ...props }, ref) => {
        const inputId = id || props.name;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-gray-900 mb-2"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {Icon && (
                        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            "w-full py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900",
                            "placeholder:text-gray-400",
                            "focus:bg-white focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10",
                            "outline-none transition-all",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            Icon ? "pl-11" : "pl-4",
                            rightElement ? "pr-12" : "pr-4",
                            error && "border-red-300 focus:border-red-500 focus:ring-red-100",
                            className
                        )}
                        {...props}
                    />
                    {rightElement && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                            {rightElement}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

FormInput.displayName = "FormInput";
