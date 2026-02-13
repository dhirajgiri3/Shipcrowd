"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface CheckboxProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    checked?: boolean | 'indeterminate';
    onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
    ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (disabled) return;
            if (onCheckedChange) {
                onCheckedChange(checked === true ? false : true);
            }
            props.onClick?.(e);
        };

        return (
            <button
                type="button"
                role="checkbox"
                aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
                disabled={disabled}
                ref={ref}
                onClick={handleClick}
                className={cn(
                    "peer h-5 w-5 shrink-0 rounded-md border border-[var(--border-strong)] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
                    checked === true || checked === 'indeterminate'
                        ? "bg-[var(--primary-blue)] border-[var(--primary-blue)] text-white"
                        : "bg-transparent hover:border-[var(--primary-blue)]",
                    className
                )}
                {...props}
            >
                <div className="flex items-center justify-center w-full h-full">
                    <AnimatePresence mode="wait" initial={false}>
                        {checked === true && (
                            <motion.div
                                key="check"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                            >
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </motion.div>
                        )}
                        {checked === 'indeterminate' && (
                            <motion.div
                                key="indeterminate"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                            >
                                <Minus className="h-3.5 w-3.5 stroke-[3]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </button>
        );
    }
);

Checkbox.displayName = "Checkbox";
