"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, Users, Package, AlertCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';

const QUICK_LINKS = [
    {
        label: 'System Health',
        href: '/admin/system-health',
        icon: Activity,
        color: 'var(--success)'
    },
    {
        label: 'Active Sellers',
        href: '/admin/sellers',
        icon: Users,
        color: 'var(--primary-purple)'
    },
    {
        label: 'Courier Services',
        href: '/admin/courier-services',
        icon: Package,
        color: 'var(--primary-blue)'
    },
    {
        label: 'Weight Disputes',
        href: '/admin/disputes/weight',
        icon: AlertCircle,
        color: 'var(--warning)'
    }
];

export function QuickLinksMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <div className="relative" ref={menuRef}>
            <Tooltip content="Quick Links">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group ${isOpen ? 'bg-[var(--bg-secondary)]' : ''}`}
                    aria-expanded={isOpen}
                >
                    <Zap className={`w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--warning)] transition-colors ${isOpen ? 'text-[var(--warning)] fill-current' : ''}`} />
                </button>
            </Tooltip>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }} // Fast transition
                        className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] shadow-xl overflow-hidden z-[var(--z-dropdown)]"
                    >
                        <div className="p-2 space-y-1">
                            <div className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                                Quick Jump
                            </div>
                            {QUICK_LINKS.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
                                    >
                                        <div className="p-1.5 rounded-md bg-[var(--bg-secondary)] group-hover:bg-[var(--bg-primary)] transition-colors">
                                            <Icon className="w-4 h-4" style={{ color: link.color }} />
                                        </div>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {link.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
