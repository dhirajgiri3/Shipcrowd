"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Command, File, Settings, Users, Box, ShoppingCart, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/src/lib/utils";
import { adminNavItems } from "@/src/components/admin/Sidebar";
import type { AdminNavItem } from "@/src/components/admin/Sidebar";

interface AdminSearchProps {
    navItems?: AdminNavItem[]; // Optional prop if we want to pass items directly
}

export function AdminSearch({ navItems = adminNavItems }: AdminSearchProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    // Group items by category (inferred from first path segment after /admin)
    const groupedItems = useMemo(() => {
        if (!query) return {};

        const q = query.toLowerCase();
        const filtered = navItems.filter(
            (item) =>
                item.label.toLowerCase().includes(q) ||
                item.href.toLowerCase().includes(q)
        );

        const groups: Record<string, AdminNavItem[]> = {};

        filtered.forEach(item => {
            // Extract category from href: /admin/orders -> orders
            const parts = item.href.split('/').filter(p => p !== '' && p !== 'admin');
            const category = parts.length > 0 ? parts[0] : 'dashboard';
            const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);

            if (!groups[formattedCategory]) {
                groups[formattedCategory] = [];
            }
            groups[formattedCategory].push(item);
        });

        return groups;
    }, [query, navItems]);

    const hasResults = Object.keys(groupedItems).length > 0;

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
            if (e.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
            setQuery("");
        }
    }, [open]);

    const handleSelect = (href: string) => {
        setOpen(false);
        router.push(href);
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className={cn(
                    "relative flex items-center w-full md:w-64 lg:w-80 h-10 px-3 rounded-xl",
                    "bg-[var(--bg-secondary)] border border-[var(--border-subtle)]",
                    "text-sm text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]",
                    "transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue-soft)]/50"
                )}
                aria-label="Search admin pages (Cmd+K)"
            >
                <Search className="h-4 w-4 mr-2.5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="hidden lg:flex items-center justify-center h-5 px-1.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded shadow-sm">
                    ⌘K
                </kbd>
            </button>

            <AnimatePresence>
                {open && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="relative w-full max-w-2xl bg-[var(--bg-primary)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-[70vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center px-4 py-3 border-b border-[var(--border-subtle)]">
                                <Search className="h-5 w-5 text-[var(--text-muted)] mr-3" />
                                <input
                                    ref={inputRef}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Type a command or search..."
                                    className="flex-1 bg-transparent border-none outline-none text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] h-8"
                                />
                                <button
                                    onClick={() => setOpen(false)}
                                    className="ml-2 p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-colors"
                                >
                                    <span className="sr-only">Close</span>
                                    <div className="text-xs font-medium px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">ESC</div>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                                {!query && (
                                    <div className="py-12 text-center">
                                        <Command className="h-10 w-10 text-[var(--text-muted)] opacity-20 mx-auto mb-3" />
                                        <p className="text-sm text-[var(--text-muted)]">
                                            Search for pages, orders, settings, and more...
                                        </p>
                                    </div>
                                )}

                                {query && !hasResults && (
                                    <div className="py-12 text-center">
                                        <p className="text-sm text-[var(--text-muted)]">
                                            No results found for <span className="font-medium text-[var(--text-primary)]">"{query}"</span>
                                        </p>
                                    </div>
                                )}

                                {hasResults && (
                                    <div className="space-y-4 px-2 pb-2">
                                        {Object.entries(groupedItems).map(([category, items]) => (
                                            <div key={category}>
                                                <h3 className="text-xs font-semibold text-[var(--text-muted)] px-3 mb-2 mt-2 uppercase tracking-wider">
                                                    {category}
                                                </h3>
                                                <div className="space-y-1">
                                                    {items.map((item) => (
                                                        <button
                                                            key={item.href}
                                                            onClick={() => handleSelect(item.href)}
                                                            className="group flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-left hover:bg-[var(--bg-secondary)] transition-colors focus:bg-[var(--bg-secondary)] focus:outline-none"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] group-hover:bg-[var(--bg-primary)] group-hover:text-[var(--primary-blue)] transition-colors border border-[var(--border-subtle)] group-hover:border-[var(--primary-blue-soft)]/30">
                                                                    <item.icon className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                                                        {item.label}
                                                                    </p>
                                                                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                                                                        {item.href}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="h-4 w-4 text-[var(--text-muted)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="px-4 py-2 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1"><kbd className="font-sans px-1 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">↵</kbd> to select</span>
                                    <span className="flex items-center gap-1"><kbd className="font-sans px-1 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">↑↓</kbd> to navigate</span>
                                    <span className="flex items-center gap-1"><kbd className="font-sans px-1 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">esc</kbd> to close</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
