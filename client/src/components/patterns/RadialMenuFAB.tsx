/**
 * RadialMenuFAB - Enhanced FAB with radial menu for quick actions
 * 
 * Expands to show multiple actions in a radial pattern when tapped.
 * Perfect for power users on mobile who need quick access to common tasks.
 * 
 * Usage:
 * <RadialMenuFAB
 *   actions={[
 *     { icon: <Plus />, label: 'Create Order', href: '/seller/orders/create' },
 *     { icon: <Wallet />, label: 'Add Funds', href: '/seller/wallet' },
 *   ]}
 * />
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface RadialMenuAction {
    icon: React.ReactNode;
    label: string;
    href?: string;
    onClick?: () => void;
    color?: string;
}

interface RadialMenuFABProps {
    actions: RadialMenuAction[];
    position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
    className?: string;
}

export function RadialMenuFAB({
    actions,
    position = 'bottom-right',
    className = ''
}: RadialMenuFABProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const router = useRouter();

    // Position classes
    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
        'bottom-left': 'bottom-6 left-6'
    };

    // Calculate radial positions for menu items
    const getRadialPosition = (index: number, total: number) => {
        // Start from top-left, go counterclockwise
        const baseAngle = -135; // Start at top-left (225deg from right = -135deg from right)
        const angleSpread = 90; // 90deg spread (quarter circle)
        const angle = baseAngle + (angleSpread / (total - 1)) * index;
        const radian = (angle * Math.PI) / 180;
        const radius = 80; // Distance from main button

        return {
            x: Math.cos(radian) * radius,
            y: Math.sin(radian) * radius
        };
    };

    const handleActionClick = (action: RadialMenuAction) => {
        setIsExpanded(false);
        if (action.onClick) {
            action.onClick();
        } else if (action.href) {
            router.push(action.href);
        }
    };

    return (
        <div className={`fixed z-[var(--z-sticky)] ${positionClasses[position]} ${className}`}>
            {/* Backdrop */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                        onClick={() => setIsExpanded(false)}
                        style={{ right: 'auto', left: 'auto', top: 'auto', bottom: 'auto' }}
                    />
                )}
            </AnimatePresence>

            {/* Action Items (Radial Menu) */}
            <AnimatePresence>
                {isExpanded && actions.map((action, index) => {
                    const pos = getRadialPosition(index, actions.length);
                    return (
                        <motion.button
                            key={index}
                            initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                            animate={{ scale: 1, x: pos.x, y: pos.y, opacity: 1 }}
                            exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                            transition={{
                                type: 'spring',
                                damping: 15,
                                stiffness: 300,
                                delay: index * 0.05
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleActionClick(action)}
                            className="absolute p-3 rounded-full bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-lg hover:bg-[var(--bg-hover)] transition-colors group"
                            style={{
                                backgroundColor: action.color || 'var(--bg-primary)'
                            }}
                            aria-label={action.label}
                        >
                            <span className="w-5 h-5 flex items-center justify-center text-[var(--text-primary)]">
                                {action.icon}
                            </span>
                            {/* Tooltip label */}
                            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-default)] text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                {action.label}
                            </span>
                        </motion.button>
                    );
                })}
            </AnimatePresence>

            {/* Main FAB Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="relative p-4 rounded-full bg-[var(--primary-blue)] text-white shadow-[var(--shadow-brand)] hover:bg-[var(--primary-blue-deep)] transition-colors"
                aria-label={isExpanded ? 'Close menu' : 'Open quick actions'}
                aria-expanded={isExpanded}
            >
                <motion.span
                    animate={{ rotate: isExpanded ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-6 h-6 flex items-center justify-center"
                >
                    {isExpanded ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                </motion.span>

                {/* Pulse ring when closed */}
                {!isExpanded && (
                    <motion.span
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0, 0.5]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                        className="absolute inset-0 rounded-full bg-[var(--primary-blue)]"
                    />
                )}
            </motion.button>
        </div>
    );
}
