/**
 * DashboardSetupBanner - Research-Backed Onboarding Motivation
 *
 * Design Philosophy:
 * - Minimal & clean (aligned with dashboard aesthetic)
 * - Progress-focused (not time-pressure)
 * - Endowed Progress Effect (start at 20% to encourage completion)
 * - Goal-Gradient Hypothesis (motivation increases near end)
 * - Checklist pattern (3-5 key tasks)
 *
 * Research:
 * - Sked Social tripled conversions with gamified checklist
 * - Milestone celebrations increase progression by 40%
 * - Progress indicators reduce drop-offs, make onboarding achievable
 *
 * What Makes This Unique:
 * - "Path to First Shipment" metaphor (shipping-specific)
 * - Inline compact checklist (not overwhelming)
 * - Next step always clear (one primary action)
 * - Celebration on completion (dopamine reward)
 */

"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth";
import {
    ArrowRight,
    X,
    CheckCircle2,
    Circle,
    Building2,
    Mail,
    FileText,
    CreditCard,
    Play
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardSetupBanner() {
    const router = useRouter();
    const { user } = useAuth();
    const [isDismissed, setIsDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const dismissed = localStorage.getItem('setup_banner_dismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
        }
    }, []);

    // Checklist steps (research: 3-5 key tasks optimal)
    const savedStep = typeof window !== 'undefined' ? localStorage.getItem('onboarding_step') : '1';
    const currentStep = savedStep ? parseInt(savedStep) : 1;

    const steps = [
        {
            id: 1,
            icon: Building2,
            label: 'Business Details',
            completed: currentStep > 1
        },
        {
            id: 2,
            icon: Mail,
            label: 'Verify Email',
            completed: currentStep > 2
        },
        {
            id: 3,
            icon: FileText,
            label: 'Upload Documents',
            completed: currentStep > 3
        },
        {
            id: 4,
            icon: CreditCard,
            label: 'Bank Account',
            completed: currentStep > 4
        },
        {
            id: 5,
            icon: Play,
            label: 'Start Shipping',
            completed: currentStep > 5
        }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const totalSteps = steps.length;
    const progress = Math.round((completedCount / totalSteps) * 100);

    // Endowed Progress Effect: Show as 20% even if 0% (research-backed)
    const displayProgress = Math.max(progress, 20);

    // Find next incomplete step
    const nextStep = steps.find(s => !s.completed);

    const handleContinue = () => {
        router.push('/onboarding');
    };

    const handleDismiss = () => {
        localStorage.setItem('setup_banner_dismissed', 'true');
        setIsDismissed(true);
    };

    if (!mounted) return null;
    if (isDismissed) return null;
    if (user?.companyId) return null;

    // Celebration state (when 100% complete)
    const isComplete = completedCount === totalSteps;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative"
        >
            {/* Compact Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-sm">
                {/* Progress Bar (Top edge) */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--bg-secondary)]">
                    <motion.div
                        className="h-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-deep)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${displayProgress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>

                <div className="p-5">
                    <div className="flex items-start gap-4">
                        {/* Left: Status Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="relative">
                                {/* Circular Progress */}
                                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        fill="none"
                                        stroke="var(--border-subtle)"
                                        strokeWidth="3"
                                        opacity="0.2"
                                    />
                                    <motion.circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        fill="none"
                                        stroke="var(--primary-blue)"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 20}`}
                                        initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                                        animate={{
                                            strokeDashoffset: 2 * Math.PI * 20 * (1 - displayProgress / 100)
                                        }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                </svg>
                                {/* Percentage */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-[var(--primary-blue)]">
                                        {displayProgress}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Middle: Content */}
                        <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="min-w-0">
                                    <h3 className="font-bold text-[var(--text-primary)] mb-1">
                                        {isComplete ? 'Setup Complete!' : 'Complete Your Setup'}
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {isComplete
                                            ? 'You\'re ready to start shipping'
                                            : `${completedCount} of ${totalSteps} steps completed`}
                                    </p>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="flex-shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--bg-hover)]"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Checklist - Inline Compact */}
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                {steps.map((step, index) => {
                                    const Icon = step.icon;
                                    const isNext = step.id === nextStep?.id;
                                    const isCompleted = step.completed;

                                    return (
                                        <motion.div
                                            key={step.id}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs ${isCompleted
                                                    ? 'bg-[var(--success-bg)] border-[var(--success)]/30 text-[var(--success)]'
                                                    : isNext
                                                        ? 'bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/30 text-[var(--primary-blue)] ring-2 ring-[var(--primary-blue)]/20'
                                                        : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                                                }`}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            ) : isNext ? (
                                                <div className="w-3.5 h-3.5 rounded-full bg-[var(--primary-blue)]" />
                                            ) : (
                                                <Circle className="w-3.5 h-3.5" />
                                            )}
                                            <Icon className="w-3.5 h-3.5" />
                                            <span className="font-medium whitespace-nowrap">{step.label}</span>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* CTA - Clear Next Action */}
                            <div className="flex items-center gap-3">
                                {!isComplete ? (
                                    <>
                                        <button
                                            onClick={handleContinue}
                                            className="inline-flex items-center gap-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white font-medium px-4 py-2 rounded-lg transition-all text-sm shadow-sm hover:shadow-md"
                                        >
                                            <span>Continue Setup</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                        {nextStep && (
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                Next: {nextStep.label}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={() => router.push('/seller/orders/create')}
                                        className="inline-flex items-center gap-2 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white font-medium px-4 py-2 rounded-lg transition-all text-sm shadow-sm hover:shadow-md"
                                    >
                                        <span>Create Your First Order</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Celebration Confetti (when complete) */}
                <AnimatePresence>
                    {isComplete && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none overflow-hidden"
                        >
                            {[...Array(10)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{
                                        background: i % 2 === 0 ? 'var(--primary-blue)' : 'var(--success)',
                                        left: `${Math.random() * 100}%`,
                                        top: -10
                                    }}
                                    initial={{ y: -10, opacity: 1 }}
                                    animate={{
                                        y: 100,
                                        opacity: 0,
                                        rotate: Math.random() * 360
                                    }}
                                    transition={{
                                        duration: 1 + Math.random(),
                                        delay: Math.random() * 0.5,
                                        ease: "easeOut"
                                    }}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
