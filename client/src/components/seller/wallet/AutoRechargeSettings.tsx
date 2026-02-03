import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Zap,
    AlertTriangle,
    CreditCard,
    Lock
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { cn } from '@/src/lib/utils';
import { AutoRechargeSettings as IAutoRechargeSettings } from '@/src/core/api/clients/finance/walletApi';

interface AutoRechargeSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: Partial<IAutoRechargeSettings>) => Promise<void>;
    currentSettings?: IAutoRechargeSettings;
    isLoading?: boolean;
}

export function AutoRechargeSettings({
    isOpen,
    onClose,
    onSave,
    currentSettings,
    isLoading = false
}: AutoRechargeSettingsProps) {
    const [enabled, setEnabled] = useState(false);
    const [threshold, setThreshold] = useState(1000);
    const [amount, setAmount] = useState(5000);
    const [paymentMethodId, setPaymentMethodId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleManagePaymentMethods = () => {
        if (typeof window !== 'undefined') {
            window.location.href = '/seller/settings';
        }
    };

    // Initialize state from currentSettings
    useEffect(() => {
        if (currentSettings) {
            setEnabled(currentSettings.enabled);
            setThreshold(currentSettings.threshold);
            setAmount(currentSettings.amount);
            setPaymentMethodId(currentSettings.paymentMethodId || '');
        }
    }, [currentSettings, isOpen]);

    const handleSubmit = async () => {
        setError(null);

        try {
            if (!enabled) {
                await onSave({ enabled: false });
                return;
            }

            // Validation (only when enabling)
            if (!paymentMethodId) {
                setError('Please add a payment method to enable auto-recharge.');
                return;
            }
            if (threshold >= amount) {
                setError('Recharge threshold must be less than recharge amount');
                return;
            }
            if (threshold < 100) {
                setError('Threshold must be at least ₹100');
                return;
            }
            if (amount < 100) {
                setError('Recharge amount must be at least ₹100');
                return;
            }

            await onSave({
                enabled: true,
                threshold,
                amount,
                paymentMethodId: paymentMethodId || undefined // Only send if set
            });
        } catch (err: any) {
            setError(err.message || 'Failed to save settings');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-[var(--bg-primary)] rounded-2xl shadow-xl border border-[var(--border-default)] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                Auto-Recharge Settings
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Never run out of wallet balance
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-default)]">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-[var(--text-primary)]">
                                Enable Auto-Recharge
                            </label>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Automatically add money when balance is low
                            </p>
                        </div>
                        {/* Fallback for Switch if not available, or use standard checkbox logic */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {/* Or if Switch component is available:
                            <Switch checked={enabled} onCheckedChange={setEnabled} />
                           */}
                        </div>
                    </div>

                    <AnimatePresence>
                        {enabled && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-6 overflow-hidden"
                            >
                                {/* Configuration */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                            If balance drops below
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">₹</span>
                                            <input
                                                type="number"
                                                value={threshold}
                                                onChange={(e) => setThreshold(Number(e.target.value))}
                                                className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary-blue)]/20 focus:border-[var(--primary-blue)] transition-all outline-none"
                                                min="100"
                                                step="100"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                            Then add amount
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">₹</span>
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(Number(e.target.value))}
                                                className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary-blue)]/20 focus:border-[var(--primary-blue)] transition-all outline-none"
                                                min="100"
                                                step="500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Method Info (Simplified) */}
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            <CreditCard className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                                Payment Method
                                            </h4>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                                        Funds will be deducted from your primary saved card.
                                    </p>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <p className="text-[11px] text-[var(--text-tertiary)]">
                                            Manage payment methods in Settings &gt; Billing.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleManagePaymentMethods}
                                        >
                                            Manage
                                        </Button>
                                    </div>
                                </div>
                                <Lock className="w-4 h-4 text-[var(--text-tertiary)]" />
                            </div>
                                </div>

                                <div className="p-3 rounded-lg bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                    <p>
                                        Daily limit of ₹1,00,000 applies. Auto-recharge will pause if payment fails 4 times.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]/30 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        isLoading={isLoading}
                        className={cn(
                            enabled ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""
                        )}
                    >
                        {enabled ? 'Save & Enable' : 'Save Settings'}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
