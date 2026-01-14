/**
 * COD Payout Settings Page
 * 
 * Comprehensive settings for automatic COD remittance:
 * - Payout frequency (daily, weekly, bi-weekly, monthly)
 * - Day of week/month selection
 * - Minimum payout threshold
 * - Bank account display
 * - Next scheduled payout preview
 * 
 * Route: /seller/cod/settings
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

type PayoutFrequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly';

interface PayoutSchedule {
    frequency: PayoutFrequency;
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    minimumAmount: number;
    isEnabled: boolean;
}

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
        value: 'daily' as PayoutFrequency,
        label: 'Daily',
        description: 'Receive payouts every business day',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
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

    const [schedule, setSchedule] = useState<PayoutSchedule>({
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        dayOfMonth: 1,
        minimumAmount: 1000,
        isEnabled: true,
    });

    // Mock bank account data - in production, fetch from API
    const bankAccount = {
        accountHolderName: 'Shipcrowd Seller',
        bankName: 'HDFC Bank',
        accountNumber: '****1234',
        ifsc: 'HDFC0001234',
    };

    const getNextPayoutDate = (): Date => {
        const now = new Date();
        const next = new Date(now);

        switch (schedule.frequency) {
            case 'daily':
                next.setDate(now.getDate() + 1);
                break;
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
            // TODO: Call API to save schedule
            // await schedulePayoutMutation.mutateAsync(schedule);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save schedule:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to COD Remittance
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Payout Settings
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Configure your automatic COD remittance schedule
                    </p>
                </div>

                {/* Success Message */}
                {saveSuccess && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-700 dark:text-green-300">Settings saved successfully!</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Main Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Enable/Disable Toggle */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Automatic Payouts
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Enable scheduled automatic COD remittance
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSchedule(s => ({ ...s, isEnabled: !s.isEnabled }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${schedule.isEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
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
                        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${!schedule.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Payout Frequency
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {FREQUENCY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSchedule(s => ({ ...s, frequency: option.value }))}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${schedule.frequency === option.value
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <div className={`mb-2 ${schedule.frequency === option.value
                                                ? 'text-primary-600 dark:text-primary-400'
                                                : 'text-gray-400 dark:text-gray-500'
                                            }`}>
                                            {option.icon}
                                        </div>
                                        <p className={`font-semibold ${schedule.frequency === option.value
                                                ? 'text-primary-700 dark:text-primary-300'
                                                : 'text-gray-900 dark:text-white'
                                            }`}>
                                            {option.label}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {option.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Day Selection */}
                        {(schedule.frequency === 'weekly' || schedule.frequency === 'bi-weekly') && schedule.isEnabled && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Payout Day
                                </h2>
                                <div className="grid grid-cols-7 gap-2">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <button
                                            key={day.value}
                                            onClick={() => setSchedule(s => ({ ...s, dayOfWeek: day.value }))}
                                            className={`p-3 rounded-lg text-center text-sm font-medium transition-all ${schedule.dayOfWeek === day.value
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Day of Month
                                </h2>
                                <div className="grid grid-cols-7 gap-2">
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                        <button
                                            key={day}
                                            onClick={() => setSchedule(s => ({ ...s, dayOfMonth: day }))}
                                            className={`p-2 rounded-lg text-center text-sm font-medium transition-all ${schedule.dayOfMonth === day
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                                    Note: Days 29-31 are not available to ensure consistency across all months.
                                </p>
                            </div>
                        )}

                        {/* Minimum Amount */}
                        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${!schedule.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Minimum Payout Amount
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Payouts will only be processed when balance exceeds this amount
                            </p>
                            <div className="relative max-w-xs">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    value={schedule.minimumAmount}
                                    onChange={(e) => setSchedule(s => ({ ...s, minimumAmount: parseInt(e.target.value) || 0 }))}
                                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    min="100"
                                    step="100"
                                />
                            </div>
                            <div className="mt-4 flex gap-2">
                                {[500, 1000, 5000, 10000].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setSchedule(s => ({ ...s, minimumAmount: amount }))}
                                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${schedule.minimumAmount === amount
                                                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {formatCurrency(amount)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Summary & Bank Account */}
                    <div className="space-y-6">
                        {/* Next Payout Preview */}
                        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg shadow p-6 text-white">
                            <h3 className="text-sm font-medium text-primary-100 mb-2">
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
                                    <p className="text-sm text-primary-100">
                                        {schedule.frequency === 'daily' ? 'Every business day' :
                                            schedule.frequency === 'weekly' ? `Every ${DAYS_OF_WEEK[schedule.dayOfWeek!].label}` :
                                                schedule.frequency === 'bi-weekly' ? `Every 2 weeks on ${DAYS_OF_WEEK[schedule.dayOfWeek!].label}` :
                                                    `On the ${schedule.dayOfMonth}${schedule.dayOfMonth === 1 ? 'st' : schedule.dayOfMonth === 2 ? 'nd' : schedule.dayOfMonth === 3 ? 'rd' : 'th'} of each month`}
                                    </p>
                                </>
                            ) : (
                                <p className="text-primary-100">
                                    Automatic payouts disabled
                                </p>
                            )}
                        </div>

                        {/* Bank Account Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Payout Account
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {bankAccount.bankName}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                            {bankAccount.accountNumber}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Account Holder</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {bankAccount.accountHolderName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">IFSC Code</p>
                                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                                        {bankAccount.ifsc}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/seller/settings/bank')}
                                className="mt-4 w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Change Bank Account
                            </button>
                        </div>

                        {/* Info Card */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                    <p className="font-medium mb-1">Processing Time</p>
                                    <p className="text-blue-600 dark:text-blue-400">
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
                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
