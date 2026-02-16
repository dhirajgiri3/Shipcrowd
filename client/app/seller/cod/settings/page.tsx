/**
 * COD Payout Settings Page
 * 
 * Comprehensive settings for automatic COD remittance:
 * - Payout frequency (weekly, bi-weekly, monthly)
 * - Day of week/month selection
 * - Minimum payout threshold
 * - Bank account display
 * - Next scheduled payout preview
 * 
 * Route: /seller/cod/settings
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/src/lib/utils';
import { useSchedulePayout } from '@/src/core/api/hooks/finance';
import { useBankAccounts } from '@/src/core/api/hooks/seller/useBankAccounts';

type PayoutFrequency = 'weekly' | 'bi-weekly' | 'monthly';

interface PayoutSchedule {
    frequency: PayoutFrequency;
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    minimumAmount: number;
    isEnabled: boolean;
}

const MIN_PAYOUT_THRESHOLD = 100;
const QUICK_PAYOUT_THRESHOLDS = [500, 1000, 5000, 10000] as const;

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

const FREQUENCY_OPTIONS = [
    {
        value: 'weekly' as PayoutFrequency,
        label: 'Weekly',
        description: 'Receive payouts once per week',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        value: 'bi-weekly' as PayoutFrequency,
        label: 'Bi-Weekly',
        description: 'Receive payouts every two weeks',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        value: 'monthly' as PayoutFrequency,
        label: 'Monthly',
        description: 'Receive payouts once per month',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        )
    },
];

export default function CODSettingsPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const schedulePayoutMutation = useSchedulePayout();

    const [schedule, setSchedule] = useState<PayoutSchedule>({
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        dayOfMonth: 1,
        minimumAmount: 1000,
        isEnabled: true,
    });

    const { data, isLoading } = useBankAccounts();
    const accounts = data?.accounts ?? [];
    const bankAccount = accounts.find((a) => a.isDefault) ?? accounts[0];

    const getNextPayoutDate = (): Date => {
        const now = new Date();
        const next = new Date(now);

        switch (schedule.frequency) {
            case 'weekly':
                const daysUntilNext = (schedule.dayOfWeek! - now.getDay() + 7) % 7 || 7;
                next.setDate(now.getDate() + daysUntilNext);
                break;
            case 'bi-weekly':
                const daysUntilBiWeekly = (schedule.dayOfWeek! - now.getDay() + 7) % 7 || 7;
                next.setDate(now.getDate() + daysUntilBiWeekly + 7);
                break;
            case 'monthly':
                next.setMonth(now.getMonth() + 1);
                next.setDate(schedule.dayOfMonth!);
                break;
        }

        return next;
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            await schedulePayoutMutation.mutateAsync({
                frequency: schedule.frequency,
                dayOfWeek: schedule.frequency === 'monthly' ? undefined : schedule.dayOfWeek,
                dayOfMonth: schedule.frequency === 'monthly' ? schedule.dayOfMonth : undefined,
            });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save schedule:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to COD Remittance
                    </button>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                        Payout Settings
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2">
                        Configure your automatic COD remittance schedule
                    </p>
                </div>

                {/* Success Message */}
                {saveSuccess && (
                    <div className="mb-6 p-4 bg-[var(--success-bg)] border border-[var(--success)] rounded-lg flex items-center gap-3">
                        <svg className="w-5 h-5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[var(--success)]">Settings saved successfully!</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Main Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Enable/Disable Toggle */}
                        <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                                        Automatic Payouts
                                    </h2>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                                        Enable scheduled automatic COD remittance
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSchedule(s => ({ ...s, isEnabled: !s.isEnabled }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${schedule.isEnabled ? 'bg-[var(--primary-blue)]' : 'bg-[var(--bg-tertiary)]'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${schedule.isEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Frequency Selection */}
                        <div className={`bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)] ${!schedule.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                Payout Frequency
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {FREQUENCY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSchedule(s => ({ ...s, frequency: option.value }))}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${schedule.frequency === option.value
                                            ? 'border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]'
                                            : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
                                            }`}
                                    >
                                        <div className={`mb-2 ${schedule.frequency === option.value
                                            ? 'text-[var(--primary-blue)]'
                                            : 'text-[var(--text-tertiary)]'
                                            }`}>
                                            {option.icon}
                                        </div>
                                        <p className={`font-semibold ${schedule.frequency === option.value
                                            ? 'text-[var(--primary-blue-deep)]'
                                            : 'text-[var(--text-primary)]'
                                            }`}>
                                            {option.label}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                                            {option.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Day Selection */}
                        {(schedule.frequency === 'weekly' || schedule.frequency === 'bi-weekly') && schedule.isEnabled && (
                            <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                    Payout Day
                                </h2>
                                <div className="grid grid-cols-7 gap-2">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <button
                                            key={day.value}
                                            onClick={() => setSchedule(s => ({ ...s, dayOfWeek: day.value }))}
                                            className={`p-3 rounded-lg text-center text-sm font-medium transition-all ${schedule.dayOfWeek === day.value
                                                ? 'bg-[var(--primary-blue)] text-white'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                                }`}
                                        >
                                            {day.label.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Monthly Day Selection */}
                        {schedule.frequency === 'monthly' && schedule.isEnabled && (
                            <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                    Day of Month
                                </h2>
                                <div className="grid grid-cols-7 gap-2">
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                        <button
                                            key={day}
                                            onClick={() => setSchedule(s => ({ ...s, dayOfMonth: day }))}
                                            className={`p-2 rounded-lg text-center text-sm font-medium transition-all ${schedule.dayOfMonth === day
                                                ? 'bg-[var(--primary-blue)] text-white'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] mt-3">
                                    Note: Days 29-31 are not available to ensure consistency across all months.
                                </p>
                            </div>
                        )}

                        {/* Minimum Amount */}
                        <div className={`bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)] ${!schedule.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                Minimum Payout Amount
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Payouts will only be processed when balance exceeds this amount
                            </p>
                            <div className="relative max-w-xs">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    value={schedule.minimumAmount}
                                    onChange={(e) => setSchedule(s => ({ ...s, minimumAmount: parseInt(e.target.value) || 0 }))}
                                    className="w-full pl-8 pr-4 py-3 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                                    min={String(MIN_PAYOUT_THRESHOLD)}
                                    step="100"
                                />
                            </div>
                            <div className="mt-4 flex gap-2">
                                {QUICK_PAYOUT_THRESHOLDS.map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setSchedule(s => ({ ...s, minimumAmount: amount }))}
                                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${schedule.minimumAmount === amount
                                            ? 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]'
                                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                                            }`}
                                    >
                                        {formatCurrency(amount, 'INR')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Summary & Bank Account */}
                    <div className="space-y-6">
                        {/* Next Payout Preview */}
                        <div className="bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)] rounded-lg shadow p-6 text-white">
                            <h3 className="text-sm font-medium text-blue-100 mb-2">
                                Next Scheduled Payout
                            </h3>
                            {schedule.isEnabled ? (
                                <>
                                    <p className="text-2xl font-bold mb-2">
                                        {getNextPayoutDate().toLocaleDateString('en-IN', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-sm text-blue-100">
                                        {schedule.frequency === 'weekly' ? `Every ${DAYS_OF_WEEK[schedule.dayOfWeek!].label}` :
                                                schedule.frequency === 'bi-weekly' ? `Every 2 weeks on ${DAYS_OF_WEEK[schedule.dayOfWeek!].label}` :
                                                    `On the ${schedule.dayOfMonth}${schedule.dayOfMonth === 1 ? 'st' : schedule.dayOfMonth === 2 ? 'nd' : schedule.dayOfMonth === 3 ? 'rd' : 'th'} of each month`}
                                    </p>
                                </>
                            ) : (
                                <p className="text-blue-100">
                                    Automatic payouts disabled
                                </p>
                            )}
                        </div>

                        {/* Bank Account Info */}
                        <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                Payout Account
                            </h3>
                            {isLoading ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-10 bg-[var(--bg-tertiary)] rounded" />
                                    <div className="h-4 bg-[var(--bg-tertiary)] rounded w-2/3" />
                                    <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/2" />
                                </div>
                            ) : !bankAccount ? (
                                <div className="text-center py-6">
                                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                                        No bank account added. Add one to receive COD remittances.
                                    </p>
                                    <Link
                                        href="/seller/bank-accounts"
                                        className="inline-flex px-4 py-2 text-sm border border-[var(--primary-blue)] text-[var(--primary-blue)] rounded-lg hover:bg-[var(--primary-blue-soft)] transition-colors"
                                    >
                                        Add Bank Account
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                                <svg className="w-5 h-5 text-[var(--primary-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">
                                                    {bankAccount.bankName}
                                                </p>
                                                <p className="text-sm text-[var(--text-secondary)] font-mono">
                                                    {bankAccount.maskedAccountNumber}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-[var(--border-default)]">
                                            <p className="text-xs text-[var(--text-secondary)]">Account Holder</p>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                {bankAccount.accountHolderName || 'Company Account'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[var(--text-secondary)]">IFSC Code</p>
                                            <p className="text-sm font-mono text-[var(--text-primary)]">
                                                {bankAccount.ifscCode}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/seller/bank-accounts"
                                        className="mt-4 w-full inline-block text-center px-4 py-2 text-sm border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                                    >
                                        Change Bank Account
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Info Card */}
                        <div className="bg-[var(--primary-blue-soft)] border border-[var(--primary-blue)]/20 rounded-lg p-4">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-[var(--primary-blue)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-[var(--primary-blue-deep)]">
                                    <p className="font-medium mb-1">Processing Time</p>
                                    <p className="text-[var(--text-secondary)]">
                                        Scheduled payouts are processed between 10:00 AM - 6:00 PM IST on business days.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-8 flex justify-end gap-4">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-3 bg-[var(--primary-blue)] text-white rounded-lg hover:bg-[var(--primary-blue-deep)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Saving...
                            </>
                        ) : (
                            'Save Settings'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
