/**
 * QuickActionsFAB - Floating Action Button for Quick Actions
 * 
 * Replaces inline QuickActionsGrid for:
 * - Cleaner dashboard flow
 * - Always accessible (no scrolling needed)
 * - Mobile-friendly design
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Package,
    Truck,
    Search,
    AlertCircle,
    RotateCcw,
    HeadphonesIcon,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const QUICK_ACTIONS = [
    {
        id: 'create-order',
        label: 'Create Order',
        icon: Plus,
        href: '/seller/orders/create',
        color: 'var(--primary-blue)'
    },
    {
        id: 'ship-orders',
        label: 'Ship Orders',
        icon: Truck,
        href: '/seller/ship-now',
        color: 'var(--primary-blue)'
    },
    {
        id: 'track-shipment',
        label: 'Track Shipment',
        icon: Search,
        href: '/seller/orders/track',
        color: 'var(--info)'
    },
    {
        id: 'add-product',
        label: 'Add Product',
        icon: Package,
        href: '/seller/products/create',
        color: 'var(--success)'
    },
    {
        id: 'ndr-actions',
        label: 'NDR Actions',
        icon: AlertCircle,
        href: '/seller/ndr',
        color: 'var(--warning)'
    },
    {
        id: 'rto-management',
        label: 'RTO Management',
        icon: RotateCcw,
        href: '/seller/rto',
        color: 'var(--error)'
    },
    {
        id: 'support',
        label: 'Get Support',
        icon: HeadphonesIcon,
        href: '/seller/support',
        color: 'var(--primary-blue)'
    }
];

export function QuickActionsFAB() {
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
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
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
                        className="fixed bottom-24 right-4 md:right-6 z-50 w-72"
                    >
                        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl p-2">
                            {QUICK_ACTIONS.map((action, index) => {
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
                className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
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
