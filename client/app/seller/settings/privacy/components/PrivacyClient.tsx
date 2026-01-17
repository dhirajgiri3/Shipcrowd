/**
 * Privacy & Data Settings Page
 *
 * Features:
 * - View and manage consent preferences
 * - Marketing email opt-in/out
 * - Export personal data (GDPR)
 * - View consent history
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Download, Bell, FileText, Clock, Check, X } from 'lucide-react';
import { Loader } from '@/components/ui';
import { consentApi, type ConsentMap, type ConsentHistoryItem } from '@/src/core/api/consentApi';
import { toast } from 'sonner';
import Link from 'next/link';

export function PrivacyClient() {
    const [consents, setConsents] = useState<ConsentMap>({});
    const [history, setHistory] = useState<ConsentHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [savingType, setSavingType] = useState<string | null>(null);

    // Load consents on mount
    useEffect(() => {
        loadConsents();
    }, []);

    const loadConsents = async () => {
        try {
            setIsLoading(true);
            const [consentData, historyData] = await Promise.all([
                consentApi.getConsents(),
                consentApi.getConsentHistory(),
            ]);
            setConsents(consentData);
            setHistory(historyData);
        } catch (error: any) {
            toast.error('Failed to load consent preferences');
            console.error('Consent load error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleConsent = async (type: 'marketing' | 'cookies' | 'data_processing', currentValue: boolean) => {
        setSavingType(type);
        try {
            if (currentValue) {
                await consentApi.withdrawConsent(type);
                toast.success(`${type.replace('_', ' ')} consent withdrawn`);
            } else {
                await consentApi.acceptConsent(type);
                toast.success(`${type.replace('_', ' ')} consent accepted`);
            }
            await loadConsents();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update consent');
        } finally {
            setSavingType(null);
        }
    };

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            await consentApi.downloadUserData();
            toast.success('Data export downloaded successfully');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to export data');
        } finally {
            setIsExporting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return <Loader variant="spinner" size="lg" message="Loading privacy settings..." centered />;
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy & Data</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Manage your consent preferences and data privacy settings
                </p>
            </div>

            {/* Core Consents (Read-only) */}
            <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Core Agreements</h2>
                        <p className="text-sm text-gray-500">Required to use our services</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Terms of Service</p>
                            <p className="text-sm text-gray-500">
                                {consents.terms?.acceptedAt ? `Accepted on ${formatDate(consents.terms.acceptedAt)}` : 'Required'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                            <Check className="w-5 h-5" />
                            <span className="text-sm font-medium">Accepted</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Privacy Policy</p>
                            <p className="text-sm text-gray-500">
                                {consents.privacy?.acceptedAt ? `Accepted on ${formatDate(consents.privacy.acceptedAt)}` : 'Required'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                            <Check className="w-5 h-5" />
                            <span className="text-sm font-medium">Accepted</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Optional Consents */}
            <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Communication Preferences</h2>
                        <p className="text-sm text-gray-500">You can change these at any time</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Marketing Consent */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Marketing Emails</p>
                            <p className="text-sm text-gray-500">Receive product updates, tips, and offers</p>
                        </div>
                        <button
                            onClick={() => handleToggleConsent('marketing', consents.marketing?.accepted || false)}
                            disabled={savingType === 'marketing'}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${consents.marketing?.accepted
                                ? 'bg-primaryBlue'
                                : 'bg-gray-200 dark:bg-gray-600'
                                }`}
                        >
                            {savingType === 'marketing' ? (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <Loader variant="spinner" size="sm" />
                                </span>
                            ) : (
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${consents.marketing?.accepted ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            )}
                        </button>
                    </div>

                    {/* Cookies Consent */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Analytics Cookies</p>
                            <p className="text-sm text-gray-500">Help us improve your experience</p>
                        </div>
                        <button
                            onClick={() => handleToggleConsent('cookies', consents.cookies?.accepted || false)}
                            disabled={savingType === 'cookies'}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${consents.cookies?.accepted
                                ? 'bg-primaryBlue'
                                : 'bg-gray-200 dark:bg-gray-600'
                                }`}
                        >
                            {savingType === 'cookies' ? (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <Loader variant="spinner" size="sm" />
                                </span>
                            ) : (
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${consents.cookies?.accepted ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Data Export */}
            <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Data</h2>
                        <p className="text-sm text-gray-500">Download a copy of your personal data</p>
                    </div>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You have the right to request a copy of your personal data that we store.
                    The export includes your profile information, consent history, and more.
                </p>

                <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-primaryBlue text-white rounded-lg hover:bg-primaryBlue/90 transition-colors disabled:opacity-50"
                >
                    {isExporting ? (
                        <>
                            <Loader variant="dots" size="sm" />
                            Exporting...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            Export My Data
                        </>
                    )}
                </button>
            </motion.div>

            {/* Consent History */}
            {history.length > 0 && (
                <motion.div
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Consent History</h2>
                            <p className="text-sm text-gray-500">Recent changes to your preferences</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {history.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                                <div className={`w-2 h-2 rounded-full ${item.action === 'accepted' ? 'bg-green-500' :
                                    item.action === 'withdrawn' ? 'bg-red-500' : 'bg-blue-500'
                                    }`} />
                                <span className="text-gray-600 dark:text-gray-400">
                                    {item.action === 'accepted' && 'Accepted'}
                                    {item.action === 'withdrawn' && 'Withdrawn'}
                                    {item.action === 'updated' && 'Updated'}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {item.type.replace('_', ' ')}
                                </span>
                                <span className="text-gray-400 ml-auto">
                                    {formatDate(item.createdAt)}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Delete Account Link */}
            <div className="text-center pt-4">
                <Link
                    href="/seller/settings/account"
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                    Want to delete your account? Go to Account Settings
                </Link>
            </div>
        </div>
    );
}
