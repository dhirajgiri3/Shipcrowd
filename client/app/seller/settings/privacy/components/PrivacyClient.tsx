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
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Download, Bell, FileText, Clock, Check, CheckCircle2, Loader2, X } from 'lucide-react';
import { Loader, Button } from '@/src/components/ui';
import { consentApi, type ConsentMap, type ConsentHistoryItem } from '@/src/core/api/clients/auth/consentApi';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import Link from 'next/link';

export function PrivacyClient() {
    const router = useRouter();

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
            handleApiError(new Error('Failed to load consent preferences'), 'Failed to load consent preferences');
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
                showSuccessToast(`${type.replace('_', ' ')} consent withdrawn`);
            } else {
                await consentApi.acceptConsent(type);
                showSuccessToast(`${type.replace('_', ' ')} consent accepted`);
            }
            await loadConsents();
        } catch (error: any) {
            handleApiError(error, 'Failed to update consent');
        } finally {
            setSavingType(null);
        }
    };

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            await consentApi.downloadUserData();
            showSuccessToast('Data export downloaded successfully');
        } catch (error: any) {
            handleApiError(error, 'Failed to export data');
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
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Privacy & Data</h1>
                <p className="text-[var(--text-secondary)] mt-1">
                    Manage your privacy settings and data preferences
                </p>
            </div>

            <motion.div
                className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-[var(--primary-blue)]/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[var(--primary-blue)]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Core Agreements</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Required to use our services</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg">
                        <div>
                            <p className="font-medium text-[var(--text-primary)]">Terms of Service</p>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Last accepted: {new Date().toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--success)]">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Accepted</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg">
                        <div>
                            <p className="font-medium text-[var(--text-primary)]">Privacy Policy</p>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Last accepted: {new Date().toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--success)]">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Accepted</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Optional Consents */}
            <motion.div
                className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-[var(--primary-purple)]/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-[var(--primary-purple)]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Communication Preferences</h2>
                        <p className="text-sm text-[var(--text-secondary)]">You can change these at any time</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Marketing Consent */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg">
                        <div>
                            <p className="font-medium text-[var(--text-primary)]">Marketing Emails</p>
                            <p className="text-sm text-[var(--text-secondary)]">Receive product updates, tips, and offers</p>
                        </div>
                        <button
                            onClick={() => handleToggleConsent('marketing', consents.marketing?.accepted || false)}
                            disabled={savingType === 'marketing'}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${consents.marketing?.accepted
                                ? 'bg-[var(--primary-blue)]'
                                : 'bg-[var(--bg-tertiary)]'
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
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg">
                        <div>
                            <p className="font-medium text-[var(--text-primary)]">Analytics Cookies</p>
                            <p className="text-sm text-[var(--text-secondary)]">Help us improve your experience</p>
                        </div>
                        <button
                            onClick={() => handleToggleConsent('cookies', consents.cookies?.accepted || false)}
                            disabled={savingType === 'cookies'}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${consents.cookies?.accepted
                                ? 'bg-[var(--primary-blue)]'
                                : 'bg-[var(--bg-tertiary)]'
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
                className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                        <Download className="w-5 h-5 text-[var(--success)]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Data</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Download a copy of your personal data</p>
                    </div>
                </div>

                <p className="text-[var(--text-secondary)] mb-4">
                    Request a complete export of all your personal data stored in our system.
                    You'll receive an email with a download link within 24 hours.
                </p>

                <Button
                    onClick={handleExportData}
                    variant="outline"
                    disabled={isExporting}
                    className="w-full"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Preparing Export...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4 mr-2" />
                            Request Data Export
                        </>
                    )}
                </Button>
            </motion.div>

            {/* Consent History */}
            {history.length > 0 && (
                <motion.div
                    className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                            <Clock className="w-5 h-5 text-[var(--text-secondary)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Consent History</h2>
                            <p className="text-sm text-[var(--text-secondary)]">Recent changes to your preferences</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {history.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                                <div className={`w-2 h-2 rounded-full ${item.action === 'accepted' ? 'bg-[var(--success)]' :
                                    item.action === 'withdrawn' ? 'bg-[var(--error)]' : 'bg-[var(--primary-blue)]'
                                    }`} />
                                <span className="text-[var(--text-secondary)]">
                                    {formatDate(item.createdAt)}
                                </span>
                                <span className="mx-1">•</span>
                                <span className="font-medium text-[var(--text-primary)]">
                                    {item.action === 'accepted' ? 'Accepted' : item.action === 'withdrawn' ? 'Withdrawn' : 'Updated'}
                                </span>
                                <span className="text-[var(--text-muted)] ml-auto">
                                    {item.type.replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Delete Account Link */}
            <div className="text-center pt-4">
                <button
                    onClick={() => router.push('/seller/settings')}
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors"
                >
                    ← Back to Settings
                </button>
            </div>
        </div>
    );
}
