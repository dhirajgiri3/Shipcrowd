/**
 * FloatingActionButton (FAB) - Mobile-first primary action button
 * Psychology: Thumb-zone optimized, always accessible for critical actions
 *
 * Usage:
 * <FloatingActionButton
 *   icon={<Plus />}
 *   label="Create Order"
 *   onClick={handleCreate}
 * />
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

interface FloatingActionButtonProps {
    icon: React.ReactNode;
    label?: string;
    onClick: () => void;
    position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
    variant?: 'primary' | 'secondary';
    showOnScrollUp?: boolean;
    className?: string;
}

export function FloatingActionButton({
    icon,
    label,
    onClick,
    position = 'bottom-right',
    variant = 'primary',
    showOnScrollUp = false,
    className = ''
}: FloatingActionButtonProps) {
    const [isVisible, setIsVisible] = useState(!showOnScrollUp);
    const [prevScrollPos, setPrevScrollPos] = useState(0);

    useEffect(() => {
        if (!showOnScrollUp) return;

        const handleScroll = () => {
            const currentScrollPos = window.scrollY;
            // Show when scrolling up or at top
            const shouldShow = prevScrollPos > currentScrollPos || currentScrollPos < 50;
            setIsVisible(shouldShow);
            setPrevScrollPos(currentScrollPos);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [prevScrollPos, showOnScrollUp]);

    // Position classes
    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
        'bottom-left': 'bottom-6 left-6'
    };

    // Variant styles
    const variantStyles = {
        primary: {
            background: 'var(--primary-blue)',
            backgroundHover: 'var(--primary-blue-deep)',
            color: '#FFFFFF',
            shadow: 'var(--shadow-brand)'
        },
        secondary: {
            background: 'var(--bg-primary)',
            backgroundHover: 'var(--bg-hover)',
            color: 'var(--text-primary)',
            shadow: 'var(--shadow-lg)'
        }
    };

    const style = variantStyles[variant];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={onClick}
                    className={`
                        fixed z-[var(--z-sticky)]
                        ${positionClasses[position]}
                        ${label ? 'px-5 py-3 rounded-full' : 'p-4 rounded-full'}
                        flex items-center gap-2
                        font-medium text-sm
                        transition-all duration-[var(--duration-base)]
                        ${variant === 'secondary' ? 'border border-[var(--border-default)]' : ''}
                        ${className}
                    `}
                    style={{
                        backgroundColor: style.background,
                        color: style.color,
                        boxShadow: style.shadow
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = style.backgroundHover;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = style.background;
                    }}
                    aria-label={label || 'Action'}
                >
                    <span className="w-5 h-5 flex items-center justify-center">
                        {icon}
                    </span>
                    {label && (
                        <span className="whitespace-nowrap">
                            {label}
                        </span>
                    )}
                </motion.button>
            )}
        </AnimatePresence>
    );
}

/**
 * ScrollToTopButton - FAB variant for scroll-to-top functionality
 */
interface ScrollToTopButtonProps {
    showAfter?: number; // Show after scrolling X pixels
    className?: string;
}

export function ScrollToTopButton({
    showAfter = 300,
    className = ''
}: ScrollToTopButtonProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > showAfter);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [showAfter]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={scrollToTop}
                    className={`
                        fixed bottom-24 right-6 z-[var(--z-sticky)]
                        p-3 rounded-full
                        bg-[var(--bg-primary)] border border-[var(--border-default)]
                        text-[var(--text-primary)]
                        shadow-[var(--shadow-lg)]
                        transition-all duration-[var(--duration-base)]
                        hover:bg-[var(--bg-hover)]
                        ${className}
                    `}
                    aria-label="Scroll to top"
                >
                    <ChevronUp className="w-5 h-5" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
