/**
 * Critical Alerts Banner (Phase 2: Dashboard Optimization)
 * 
 * Sticky banner for critical conditions that sellers can't afford to miss:
 * - Wallet running out (projected to hit zero)
 * - RTO spike detection (>20% increase)
 * - COD settlement delays (>3 days overdue)
 * 
 * Psychology: Loss aversion - immediate visibility of problems
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, TrendingUp, Clock, Wallet } from 'lucide-react';

export interface CriticalAlert {
    id: string;
    type: 'wallet_low' | 'rto_spike' | 'settlement_delayed';
    severity: 'critical' | 'warning';
    title: string;
    message: string;
    ctaLabel: string;
    ctaUrl: string;
    dismissable: boolean;
}

interface CriticalAlertsBannerProps {
    alerts: CriticalAlert[];
    onDismiss?: (alertId: string) => void;
}

export function CriticalAlertsBanner({ alerts, onDismiss }: CriticalAlertsBannerProps) {
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

    // Load dismissed alerts from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('dismissedAlerts');
        if (stored) {
            setDismissedAlerts(new Set(JSON.parse(stored)));
        }
    }, []);

    const handleDismiss = (alertId: string) => {
        const newDismissed = new Set(dismissedAlerts);
        newDismissed.add(alertId);
        setDismissedAlerts(newDismissed);
        localStorage.setItem('dismissedAlerts', JSON.stringify(Array.from(newDismissed)));
        onDismiss?.(alertId);
    };

    // Filter out dismissed alerts
    const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

    if (activeAlerts.length === 0) return null;

    // Show only the highest priority alert
    const topAlert = activeAlerts[0];

    const getIcon = () => {
        switch (topAlert.type) {
            case 'wallet_low':
                return <Wallet className="w-5 h-5" />;
            case 'rto_spike':
                return <TrendingUp className="w-5 h-5" />;
            case 'settlement_delayed':
                return <Clock className="w-5 h-5" />;
            default:
                return <AlertTriangle className="w-5 h-5" />;
        }
    };

    const getBgColor = () => {
        return topAlert.severity === 'critical'
            ? 'bg-[var(--error-bg)] border-[var(--error)]'
            : 'bg-[var(--warning-bg)] border-[var(--warning)]';
    };

    const getTextColor = () => {
        return topAlert.severity === 'critical'
            ? 'text-[var(--error)]'
            : 'text-[var(--warning)]';
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`sticky top-0 z-50 ${getBgColor()} border-l-4 rounded-xl p-4 shadow-lg mb-6`}
            >
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`${getTextColor()} flex-shrink-0`}>
                        {getIcon()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className={`text-sm font-bold ${getTextColor()} mb-1`}>
                                    {topAlert.title}
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {topAlert.message}
                                </p>
                            </div>

                            {/* Dismiss button */}
                            {topAlert.dismissable && (
                                <button
                                    onClick={() => handleDismiss(topAlert.id)}
                                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-md hover:bg-[var(--bg-secondary)]"
                                    aria-label="Dismiss alert"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* CTA Button */}
                        {topAlert.ctaUrl && (
                            <a
                                href={topAlert.ctaUrl}
                                className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${topAlert.severity === 'critical'
                                        ? 'bg-[var(--error)] text-white hover:bg-[var(--error-deep)]'
                                        : 'bg-[var(--warning)] text-white hover:bg-[var(--warning-deep)]'
                                    } shadow-sm hover:shadow-md active:scale-[0.98]`}
                            >
                                {topAlert.ctaLabel}
                            </a>
                        )}
                    </div>

                    {/* Alert count badge (if multiple) */}
                    {activeAlerts.length > 1 && (
                        <div className={`${getBgColor()} ${getTextColor()} px-2 py-1 rounded-full text-xs font-bold`}>
                            +{activeAlerts.length - 1}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
