/**
 * QuickAddMoney - Psychology-Driven Wallet Recharge
 *
 * REDESIGNED: Jan 21, 2026
 * - Complete UI overhaul for clarity and ease
 * - Mobile-first bottom sheet with smooth animations
 * - Clear visual hierarchy: Amount → Method → Action
 * - One-handed operation friendly
 *
 * Psychology Applied:
 * - Progressive Disclosure: Show one decision at a time
 * - Default Bias: Pre-select most popular option (5,000 INR + UPI)
 * - Visual Hierarchy: Larger = more important
 * - Immediate Feedback: Real-time validation, clear states
 * - Trust Signals: Security badges, instant credit promise
 *
 * UX Improvements:
 * - ✅ Removed clutter: Clean, focused design
 * - ✅ Better spacing: More breathable layout
 * - ✅ Clearer labels: Self-explanatory copy
 * - ✅ Larger touch targets: All buttons ≥ 48px
 * - ✅ Better responsiveness: Adapts to screen size
 * - ✅ Smoother animations: Spring physics for natural feel
 */

"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    CreditCard,
    Smartphone,
    Building2,
    ShieldCheck,
    Zap,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { cn, formatCurrency } from '@/src/lib/utils';

export type PaymentMethod = 'upi' | 'card' | 'netbanking';

interface QuickAddMoneyProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (amount: number, method: PaymentMethod) => Promise<void>;
    isGatewayReady?: boolean;
    gatewayError?: string | null;
    /** Pre-select amount when modal opens (e.g. from quick-add preset) */
    initialAmount?: number;
    className?: string;
}

interface PresetAmount {
    value: number;
    subtext: string;
    badge?: { text: string; color: string };
}

const MIN_RECHARGE_AMOUNT = 100;
const MAX_RECHARGE_AMOUNT = 100000;

const PRESET_AMOUNTS: PresetAmount[] = [
    {
        value: 1000,
        subtext: '~3 orders',
        badge: { text: 'Starter', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' }
    },
    {
        value: 5000,
        subtext: '~15 orders',
        badge: { text: 'Popular', color: 'bg-[var(--primary-blue)] text-white' }
    },
    {
        value: 10000,
        subtext: '~30 orders',
        badge: { text: 'Best Value', color: 'bg-[var(--success)] text-white' }
    },
];

const PAYMENT_METHODS = [
    {
        id: 'upi' as const,
        name: 'UPI',
        icon: Smartphone,
        description: 'PhonePe, Google Pay, Paytm',
        badge: 'Instant',
        recommended: true
    },
    {
        id: 'card' as const,
        name: 'Cards',
        icon: CreditCard,
        description: 'Credit or Debit Card',
        badge: null,
        recommended: false
    },
    {
        id: 'netbanking' as const,
        name: 'Net Banking',
        icon: Building2,
        description: 'All major banks',
        badge: null,
        recommended: false
    },
];

export function QuickAddMoney({
    isOpen,
    onClose,
    onSubmit,
    isGatewayReady = true,
    gatewayError = null,
    initialAmount,
    className = ''
}: QuickAddMoneyProps) {
    const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount ?? 5000);
    const [customAmount, setCustomAmount] = useState('');

    // Reset/sync amount when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedAmount(initialAmount ?? 5000);
            setCustomAmount('');
        }
    }, [isOpen, initialAmount]);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi'); // Default to fastest
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const finalAmount = customAmount ? parseInt(customAmount) : selectedAmount;

    const handleSubmit = async () => {
        setError('');

        if (gatewayError) {
            setError(gatewayError);
            return;
        }

        if (!isGatewayReady) {
            setError('Payment gateway is still loading. Please wait a moment and try again.');
            return;
        }

        // Validation
        if (!finalAmount || finalAmount < MIN_RECHARGE_AMOUNT) {
            setError(`Minimum recharge amount is ${formatCurrency(MIN_RECHARGE_AMOUNT, 'INR')}`);
            return;
        }

        if (finalAmount > MAX_RECHARGE_AMOUNT) {
            setError(`Maximum recharge amount is ${formatCurrency(MAX_RECHARGE_AMOUNT, 'INR')}`);
            return;
        }

        setIsLoading(true);
        try {
            await onSubmit(finalAmount, selectedMethod);
            // Reset on success
            setCustomAmount('');
            setSelectedAmount(5000);
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Payment failed. Please try again.';
            setError(message);
            console.error('Payment error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePresetClick = (value: number) => {
        setSelectedAmount(value);
        setCustomAmount(''); // Clear custom input
        setError(''); // Clear errors
    };

    const handleCustomAmountChange = (value: string) => {
        setCustomAmount(value);
        setError(''); // Clear errors on change
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop - h-[100dvh] overflow-hidden matches OrderDetailsPanel/DetailPanel for proper viewport coverage */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 h-[100dvh] bg-black/60 backdrop-blur-sm z-50 overflow-hidden"
                        onClick={onClose}
                    />

                    {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={cn(
                            'fixed bottom-0 left-0 right-0 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto',
                            'md:max-w-lg md:rounded-3xl',
                            'bg-[var(--bg-primary)] rounded-t-3xl shadow-2xl z-50',
                            'max-h-[92vh] md:max-h-[85vh] overflow-hidden flex flex-col',
                            className
                        )}
                    >
                        {/* Pull Handle (Mobile only) */}
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-12 h-1.5 bg-[var(--border-default)] rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--border-subtle)]">
                            <div>
                                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                                    Add Money to Wallet
                                </h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5">
                                    <Zap className="w-4 h-4 text-[var(--warning)]" />
                                    Instant credit • Zero processing fee
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-[var(--bg-secondary)] rounded-xl transition-colors -mr-1"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        {/* Content - Scrollable (min-h-0 required for flex+overflow to shrink properly) */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-8">
                            {/* Error Message - Top for visibility */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-start gap-3 p-4 bg-[var(--error-bg)] border border-[var(--error)]/30 rounded-xl"
                                    >
                                        <AlertCircle className="w-5 h-5 text-[var(--error)] flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--error)]">
                                                {error}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* SECTION 1: Select Amount */}
                            <div>
                                <label className="block text-base font-bold text-[var(--text-primary)] mb-4">
                                    1. Choose Amount
                                </label>

                                {/* Preset Amounts Grid */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {PRESET_AMOUNTS.map((preset) => (
                                        <motion.button
                                            key={preset.value}
                                            onClick={() => handlePresetClick(preset.value)}
                                            whileTap={{ scale: 0.97 }}
                                            className={cn(
                                                'relative p-4 rounded-2xl border-2 transition-all h-24 flex flex-col justify-between',
                                                selectedAmount === preset.value && !customAmount
                                                    ? 'border-[var(--primary-blue)] bg-[var(--primary-blue)]/10 ring-2 ring-[var(--primary-blue)]/20'
                                                    : 'border-[var(--border-subtle)] hover:border-[var(--border-focus)] active:border-[var(--primary-blue)]'
                                            )}
                                        >
                                            {/* Badge */}
                                            {preset.badge && (
                                                <div className={cn(
                                                    'absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap',
                                                    preset.badge.color
                                                )}>
                                                    {preset.badge.text}
                                                </div>
                                            )}

                                            <div className="text-xl font-black text-[var(--text-primary)] leading-tight">
                                                {formatCurrency(preset.value, 'INR')}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                                                {preset.subtext}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Custom Amount Input - Synced with preset selection */}
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[var(--text-secondary)] pointer-events-none">
                                        ₹
                                    </div>
                                    <input
                                        type="number"
                                        value={customAmount || (selectedAmount ? String(selectedAmount) : '')}
                                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                                        placeholder="Or enter custom amount"
                                        className={cn(
                                            'w-full pl-12 pr-4 py-4 text-xl font-bold',
                                            'bg-[var(--bg-secondary)] border-2 rounded-2xl transition-all',
                                            customAmount
                                                ? 'border-[var(--primary-blue)] ring-2 ring-[var(--primary-blue)]/20'
                                                : 'border-[var(--border-subtle)] focus:border-[var(--border-focus)]',
                                            'text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-medium placeholder:text-base',
                                            'focus:outline-none'
                                        )}
                                        min={String(MIN_RECHARGE_AMOUNT)}
                                        max={String(MAX_RECHARGE_AMOUNT)}
                                        step="100"
                                    />
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2 ml-1">
                                    Min: {formatCurrency(MIN_RECHARGE_AMOUNT, 'INR')} • Max: {formatCurrency(MAX_RECHARGE_AMOUNT, 'INR')}
                                </p>
                            </div>

                            {/* SECTION 2: Payment Method */}
                            <div>
                                <label className="block text-base font-bold text-[var(--text-primary)] mb-4">
                                    2. Select Payment Method
                                </label>
                                <div className="space-y-3">
                                    {PAYMENT_METHODS.map((method) => {
                                        const Icon = method.icon;
                                        const isSelected = selectedMethod === method.id;

                                        return (
                                            <motion.button
                                                key={method.id}
                                                onClick={() => setSelectedMethod(method.id)}
                                                whileTap={{ scale: 0.98 }}
                                                className={cn(
                                                    'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all',
                                                    isSelected
                                                        ? 'border-[var(--primary-blue)] bg-[var(--primary-blue)]/10 ring-2 ring-[var(--primary-blue)]/20'
                                                        : 'border-[var(--border-subtle)] hover:border-[var(--border-focus)] active:border-[var(--primary-blue)]'
                                                )}
                                            >
                                                {/* Icon */}
                                                <div className={cn(
                                                    'p-3 rounded-xl transition-all',
                                                    isSelected
                                                        ? 'bg-[var(--primary-blue)] text-white scale-105'
                                                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                                                )}>
                                                    <Icon className="w-6 h-6" />
                                                </div>

                                                {/* Text */}
                                                <div className="flex-1 text-left">
                                                    <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                                        {method.name}
                                                        {method.recommended && (
                                                            <span className="text-xs font-semibold text-[var(--success)] bg-[var(--success-bg)] px-2 py-0.5 rounded">
                                                                Recommended
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-[var(--text-secondary)] mt-0.5">
                                                        {method.description}
                                                    </div>
                                                </div>

                                                {/* Badge */}
                                                {method.badge && (
                                                    <div className="bg-[var(--warning-bg)] text-[var(--warning)] text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        {method.badge}
                                                    </div>
                                                )}

                                                {/* Arrow indicator */}
                                                <ChevronRight className={cn(
                                                    'w-5 h-5 transition-all',
                                                    isSelected ? 'text-[var(--primary-blue)]' : 'text-[var(--text-muted)]'
                                                )} />
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Trust Badges */}
                            <div className="flex items-center justify-center gap-6 py-4 bg-[var(--bg-secondary)] rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-[var(--success)]" />
                                    <span className="text-sm font-semibold text-[var(--text-secondary)]">
                                        256-bit Secure
                                    </span>
                                </div>
                                <div className="w-px h-5 bg-[var(--border-default)]" />
                                <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-[var(--warning)]" />
                                    <span className="text-sm font-semibold text-[var(--text-secondary)]">
                                        Instant Credit
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer - Sticky Action; responsive padding and safe area on mobile */}
                        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 sm:px-6 pt-4 pb-3 shrink-0">
                            <Button
                                onClick={handleSubmit}
                                isLoading={isLoading}
                                disabled={!finalAmount || finalAmount < MIN_RECHARGE_AMOUNT || isLoading || !isGatewayReady || !!gatewayError}
                                className={cn(
                                    'w-full min-h-[48px] h-12 sm:h-14 rounded-xl sm:rounded-2xl shadow-lg transition-all',
                                    'text-base sm:text-lg font-semibold sm:font-bold',
                                    'px-4 py-3 sm:py-4',
                                    'active:scale-[0.98]'
                                )}
                            >
                                {isLoading ? (
                                    <span className="truncate">Processing payment...</span>
                                ) : gatewayError ? (
                                    <span className="truncate">Payment gateway unavailable</span>
                                ) : !isGatewayReady ? (
                                    <span className="truncate">Loading payment gateway...</span>
                                ) : finalAmount && finalAmount >= MIN_RECHARGE_AMOUNT ? (
                                    <>
                                        <span className="sm:hidden truncate">
                                            Pay {formatCurrency(finalAmount, 'INR')}
                                        </span>
                                        <span className="hidden sm:inline truncate">
                                            Proceed to Pay {formatCurrency(finalAmount, 'INR')}
                                        </span>
                                    </>
                                ) : (
                                    <span className="truncate">Select an amount to continue</span>
                                )}
                            </Button>

                            <p className="text-xs text-center text-[var(--text-muted)] mt-3 mb-0">
                                Secure payment powered by Razorpay. Amount credited instantly.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
