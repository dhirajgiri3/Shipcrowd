"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    X,
    LifeBuoy,
    Activity,
    Truck,
    Users,
    Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const ADMIN_QUICK_ACTIONS = [
    {
        id: 'support-ticket',
        label: 'Support Tickets',
        icon: LifeBuoy,
        href: '/admin/support',
        color: 'var(--primary-blue)'
    },
    {
        id: 'system-health',
        label: 'System Health',
        icon: Activity,
        href: '/admin/system-health',
        color: 'var(--success)'
    },
    {
        id: 'courier-services',
        label: 'Courier Services',
        icon: Truck,
        href: '/admin/courier-services',
        color: 'var(--warning)'
    },
    {
        id: 'sellers',
        label: 'Manage Sellers',
        icon: Users,
        href: '/admin/sellers',
        color: 'var(--primary-purple)'
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        href: '/admin/settings',
        color: 'var(--text-secondary)'
    }
];

export function AdminQuickActionsFAB() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleAction = (href: string) => {
        router.push(href);
        setIsOpen(false);
    };

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[var(--z-overlay)]"
                    />
                )}
            </AnimatePresence>

            {/* Action Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-24 right-4 md:right-6 z-[var(--z-modal)] w-72 origin-bottom-right"
                    >
                        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl p-2">
                            {ADMIN_QUICK_ACTIONS.map((action, index) => {
                                const Icon = action.icon;
                                return (
                                    <motion.button
                                        key={action.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleAction(action.href)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
                                    >
                                        <div
                                            className="p-2 rounded-lg"
                                            style={{ backgroundColor: `${action.color}20` }}
                                        >
                                            <Icon className="w-5 h-5" style={{ color: action.color }} />
                                        </div>
                                        <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary-blue)]">
                                            {action.label}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-[var(--z-sticky)] w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
                aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X className="w-6 h-6" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="plus"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Plus className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </>
    );
}
