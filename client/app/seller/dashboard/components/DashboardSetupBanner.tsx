"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth";
import { Rocket, ArrowRight, X, CheckCircle2, Package, Truck, BarChart2, ShieldCheck, Box } from "lucide-react";
import { useState, useEffect } from "react";


/**
 * Dashboard setup banner for users who haven't completed onboarding
 * Shows progress and allows them to resume setup or dismiss
 */
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

    // Check localStorage for saved progress
    const savedStep = typeof window !== 'undefined' ? localStorage.getItem('onboarding_step') : '1';
    const currentStep = savedStep ? parseInt(savedStep) : 1;
    const totalSteps = 5;
    const progress = Math.round((currentStep / totalSteps) * 100);

    const handleResume = () => {
        router.push('/onboarding');
    };

    const handleDismiss = () => {
        // Store dismissal in localStorage (temporary - shows again on refresh)
        localStorage.setItem('setup_banner_dismissed', 'true');
        setIsDismissed(true);
    };

    // Don't show until mounted to prevent hydration mismatch
    if (!mounted) return null;

    // Don't show if dismissed this session
    if (isDismissed) return null;

    // Don't show if user has company
    if (user?.companyId) return null;

    return (
        <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] dark:border-[var(--border-default)] dark:bg-[var(--bg-secondary)] shadow-sm dark:shadow-none mb-8 transition-all duration-300 hover:shadow-md group">

            {/* Background Decoration - Subtle Gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-blue-soft)]/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50" />

            <div className="relative p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">

                    {/* Left Section: Content */}
                    <div className="flex-1 space-y-6 w-full">
                        <div className="flex items-start justify-between w-full">
                            <div className="flex gap-4">
                                <div className="hidden sm:flex h-12 w-12 rounded-xl bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] items-center justify-center shrink-0">
                                    <Rocket className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
                                        Complete Your Setup
                                    </h3>
                                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-lg">
                                        You're almost there! Finish your profile setup to unlock shipping features and start managing your orders.
                                    </p>
                                </div>
                            </div>

                            {/* Mobile Dismiss */}
                            <button
                                onClick={handleDismiss}
                                className="lg:hidden text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-3 max-w-xl">
                            <div className="flex items-center justify-between text-xs font-medium">
                                <span className="text-[var(--text-secondary)]">Setup Progress</span>
                                <span className="text-[var(--primary-blue)]">{progress}% Completed</span>
                            </div>
                            <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="h-full bg-[var(--primary-blue)] rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,37,255,0.3)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-[var(--text-tertiary)]">
                                Step {currentStep} of {totalSteps}: <span className="text-[var(--text-secondary)]">Basic Details</span>
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-4 pt-2">
                            <button
                                onClick={handleResume}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary-blue)] text-white text-sm font-medium rounded-lg hover:bg-[var(--primary-blue-deep)] transition-all shadow-[0_4px_14px_rgba(37,37,255,0.2)] hover:shadow-[0_6px_20px_rgba(37,37,255,0.3)] active:scale-95"
                            >
                                Resume Setup
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="hidden lg:inline-flex px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                Remind me later
                            </button>
                        </div>
                    </div>

                    {/* Right Section: Features Grid (Desktop) */}
                    <div className="hidden lg:block w-px self-stretch bg-[var(--border-subtle)] dark:bg-[var(--border-default)] mx-4" />

                    <div className="hidden lg:flex w-full max-w-md flex-col space-y-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                            Features you'll unlock
                        </span>

                        <div className="grid grid-cols-2 gap-4">
                            <FeatureItem icon={Box} label="Create Shipments" />
                            <FeatureItem icon={Truck} label="Track Packages" />
                            <FeatureItem icon={BarChart2} label="Analytics Dashboard" />
                            <FeatureItem icon={ShieldCheck} label="Order Management" />
                        </div>

                        <div className="pt-2 text-xs text-[var(--text-tertiary)]">
                            + Access to 24/7 dedicated support
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)] dark:border-[var(--border-default)]">
            <Icon className="w-4 h-4 text-[var(--primary-blue)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        </div>
    );
}
