"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface AccordionProps {
    type?: "single" | "multiple";
    collapsible?: boolean;
    defaultValue?: string | string[];
    value?: string | string[];
    onValueChange?: (value: string | string[]) => void;
    children: React.ReactNode;
    className?: string;
}

const AccordionContext = React.createContext<{
    expanded: string[];
    toggle: (value: string) => void;
}>({
    expanded: [],
    toggle: () => { },
});

export function Accordion({
    type = "single",
    collapsible = true,
    defaultValue,
    value,
    onValueChange,
    children,
    className,
}: AccordionProps) {
    const [expandedState, setExpandedState] = React.useState<string[]>(
        Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
    );

    const isControlled = value !== undefined;
    const expanded = isControlled
        ? Array.isArray(value)
            ? value
            : value
                ? [value]
                : []
        : expandedState;

    const toggle = (itemValue: string) => {
        let newExpanded: string[];
        if (type === "single") {
            if (expanded.includes(itemValue)) {
                newExpanded = collapsible ? [] : [itemValue];
            } else {
                newExpanded = [itemValue];
            }
        } else {
            // multiple
            if (expanded.includes(itemValue)) {
                newExpanded = expanded.filter((v) => v !== itemValue);
            } else {
                newExpanded = [...expanded, itemValue];
            }
        }

        if (!isControlled) {
            setExpandedState(newExpanded);
        }

        if (onValueChange) {
            onValueChange(type === "single" ? newExpanded[0] || "" : newExpanded);
        }
    };

    return (
        <AccordionContext.Provider value={{ expanded, toggle }}>
            <div className={cn("space-y-1", className)}>{children}</div>
        </AccordionContext.Provider>
    );
}

interface AccordionItemProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export function AccordionItem({ value, children, className }: AccordionItemProps) {
    return (
        <div
            className={cn(
                "border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-primary)] overflow-hidden transition-all duration-200",
                className
            )}
        >
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { value } as any);
                }
                return child;
            })}
        </div>
    );
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    value?: string; // Injected by Item
}

export function AccordionTrigger({
    children,
    className,
    value,
    ...props
}: AccordionTriggerProps) {
    const { expanded, toggle } = React.useContext(AccordionContext);
    const isOpen = value ? expanded.includes(value) : false;

    return (
        <button
            type="button"
            onClick={() => value && toggle(value)}
            className={cn(
                "flex flex-1 items-center justify-between w-full py-4 px-4 text-sm font-medium transition-all hover:bg-[var(--bg-subtle)] text-start",
                isOpen && "border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown
                className={cn(
                    "h-4 w-4 text-[var(--text-muted)] transition-transform duration-200",
                    isOpen && "transform rotate-180"
                )}
            />
        </button>
    );
}

interface AccordionContentProps {
    children: React.ReactNode;
    className?: string;
    value?: string; // Injected by Item
}

export function AccordionContent({
    children,
    className,
    value,
}: AccordionContentProps) {
    const { expanded } = React.useContext(AccordionContext);
    const isOpen = value ? expanded.includes(value) : false;

    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    <div className={cn("px-4 py-4 pt-4", className)}>{children}</div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
