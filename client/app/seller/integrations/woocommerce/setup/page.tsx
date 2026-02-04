/**
 * WooCommerce Integration Setup (Modal)
 *
 * Beautiful modal-style integration for WooCommerce stores
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    useTestConnection,
    useCreateIntegration,
} from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import { useIntegrationState } from '@/src/core/api/hooks/integrations/useIntegrationState';
import {
    parseIntegrationError,
    formatErrorMessage
} from '@/src/core/api/hooks/integrations/integrationErrors';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clipboard,
    Clock,
    Eye,
    EyeOff,
    HelpCircle,
    Info,
    Loader2,
    X,
} from 'lucide-react';
import type {
    IntegrationSettings,
    FieldMapping,
    WooCommerceCredentials,
    SyncFrequency,
} from '@/src/types/api/integrations';

// Shared Components
import { Input } from '@/src/components/ui/core/Input';
import { Button } from '@/src/components/ui/core/Button';
import { Select } from '@/src/components/ui/form/Select';
import { Switch } from '@/src/components/ui/core/Switch';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { Badge } from '@/src/components/ui/core/Badge';
import { Dialog, DialogContent, DialogTitle } from '@/src/components/ui/feedback/Dialog';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';
import { IntegrationSkeleton } from '@/src/components/ui/feedback/IntegrationSkeleton';

const syncFrequencyOptions = [
    { value: 'EVERY_5_MIN', label: 'Every 5 minutes' },
    { value: 'EVERY_15_MIN', label: 'Every 15 minutes' },
    { value: 'HOURLY', label: 'Hourly' },
    { value: 'MANUAL', label: 'Manual sync only' },
];

const formatTestedAt = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);

export default function WooCommerceIntegrationPage() {
    const router = useRouter();
    const { addToast } = useToast();

    const [showConsumerSecret, setShowConsumerSecret] = useState(false);
    const [storeName, setStoreName] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
    const [testAttempted, setTestAttempted] = useState(false);
    const [validationStatus, setValidationStatus] = useState<{
        storeUrl: 'idle' | 'validating' | 'valid' | 'invalid';
        consumerKey: 'idle' | 'valid' | 'invalid';
        consumerSecret: 'idle' | 'valid' | 'invalid';
    }>({
        storeUrl: 'idle',
        consumerKey: 'idle',
        consumerSecret: 'idle',
    });
    const [isOnline, setIsOnline] = useState(true);
    const [clipboardSuccess, setClipboardSuccess] = useState<string | null>(null);
    const [touched, setTouched] = useState({
        storeUrl: false,
        consumerKey: false,
        consumerSecret: false,
    });

    const defaultSettings: Partial<IntegrationSettings> = {
        syncFrequency: 'EVERY_15_MIN',
        autoFulfill: false,
        autoTrackingUpdate: true,
        syncHistoricalOrders: false,
        orderFilters: {},
        notifications: {
            syncErrors: true,
            connectionIssues: true,
            lowInventory: true,
        },
    };

    const {
        formData,
        updateField,
        clearDraft,
        isDraft,
        saveDraft
    } = useIntegrationState({
        integrationType: 'WOOCOMMERCE',
        initialState: {
            storeUrl: '',
            consumerKey: '',
            consumerSecret: '',
            settings: defaultSettings,
        },
        autoSave: true, // Enable auto-save
        autoSaveDelay: 500
    });

    const { storeUrl, consumerKey, consumerSecret, settings } = formData;
    const setStoreUrl = (val: string) => updateField('storeUrl', val);
    const setConsumerKey = (val: string) => updateField('consumerKey', val);
    const setConsumerSecret = (val: string) => updateField('consumerSecret', val);
    const setSettings = (val: any) => {
        if (typeof val === 'function') {
            updateField('settings', val(settings));
        } else {
            updateField('settings', val);
        }
    };

    const { mutate: testConnection, isPending: isTesting } = useTestConnection();
    const { mutate: createIntegration, isPending: isCreating } = useCreateIntegration();

    // Online/offline detection
    useEffect(() => {
        const handleOffline = () => {
            setIsOnline(false);
            addToast('You are offline. Please check your internet connection.', 'warning');
        };

        const handleOnline = () => {
            setIsOnline(true);
            addToast('Connection restored', 'success');
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [addToast]);

    // Show skeleton on initial load if we have a saved draft loading
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        // Simulate initial checks
        const timer = setTimeout(() => setIsInitialLoad(false), 800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setTestResult(null);
        setLastTestedAt(null);
    }, [storeUrl, consumerKey, consumerSecret]);

    // Keyboard shortcut for paste
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            try {
                const text = await navigator.clipboard.readText();
                if (!text) return;

                if (text.startsWith('ck_') && !consumerKey) {
                    setConsumerKey(text.trim());
                    addToast('Pasted Consumer Key', 'info');
                } else if (text.startsWith('cs_') && !consumerSecret) {
                    setConsumerSecret(text.trim());
                    addToast('Pasted Consumer Secret', 'info');
                } else if ((text.includes('http') || text.includes('www') || text.includes('.com')) && !storeUrl) {
                    setStoreUrl(text.trim());
                    addToast('Pasted Store URL', 'info');
                }
            } catch (err) {
                // Clipboard access denied
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    navigator.clipboard.readText().then(text => {
                        if (text) {
                            if (text.startsWith('ck_') && !consumerKey) {
                                setConsumerKey(text.trim());
                                addToast('Pasted Consumer Key', 'info');
                            } else if (text.startsWith('cs_') && !consumerSecret) {
                                setConsumerSecret(text.trim());
                                addToast('Pasted Consumer Secret', 'info');
                            } else if ((text.includes('http') || text.includes('www') || text.includes('.com')) && !storeUrl) {
                                setStoreUrl(text.trim());
                                addToast('Pasted Store URL', 'info');
                            }
                        }
                    }).catch(() => { });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [storeUrl, consumerKey, consumerSecret, addToast]);

    // Real-time URL validation with debouncing
    useEffect(() => {
        if (!storeUrl) {
            setValidationStatus(prev => ({ ...prev, storeUrl: 'idle' }));
            return;
        }

        setValidationStatus(prev => ({ ...prev, storeUrl: 'validating' }));
        const timer = setTimeout(() => {
            const isValid = isValidUrl(storeUrl);
            setValidationStatus(prev => ({ ...prev, storeUrl: isValid ? 'valid' : 'invalid' }));
        }, 300);

        return () => clearTimeout(timer);
    }, [storeUrl]);

    // Consumer Key validation
    useEffect(() => {
        if (!consumerKey) {
            setValidationStatus(prev => ({ ...prev, consumerKey: 'idle' }));
            return;
        }
        const isValid = consumerKey.startsWith('ck_') && consumerKey.length > 10;
        setValidationStatus(prev => ({ ...prev, consumerKey: isValid ? 'valid' : 'invalid' }));
    }, [consumerKey]);

    // Consumer Secret validation
    useEffect(() => {
        if (!consumerSecret) {
            setValidationStatus(prev => ({ ...prev, consumerSecret: 'idle' }));
            return;
        }
        const isValid = consumerSecret.startsWith('cs_') && consumerSecret.length > 10;
        setValidationStatus(prev => ({ ...prev, consumerSecret: isValid ? 'valid' : 'invalid' }));
    }, [consumerSecret]);

    const isValidUrl = (url: string) => {
        try {
            new URL(url.startsWith('http') ? url : `https://${url}`);
            return true;
        } catch {
            return false;
        }
    };

    const storeUrlError = useMemo(() => {
        if (!storeUrl) {
            return touched.storeUrl || testAttempted ? 'Store URL is required' : '';
        }
        if (!isValidUrl(storeUrl)) {
            return 'Enter a valid store URL (e.g., yourstore.com or https://yourstore.com)';
        }
        return '';
    }, [storeUrl, touched.storeUrl, testAttempted]);

    const consumerKeyError = useMemo(() => {
        if (!consumerKey) {
            return touched.consumerKey || testAttempted ? 'Consumer Key is required' : '';
        }
        if (!consumerKey.startsWith('ck_')) {
            return 'Consumer Key should start with "ck_"';
        }
        return '';
    }, [consumerKey, touched.consumerKey, testAttempted]);

    const consumerSecretError = useMemo(() => {
        if (!consumerSecret) {
            return touched.consumerSecret || testAttempted ? 'Consumer Secret is required' : '';
        }
        if (!consumerSecret.startsWith('cs_')) {
            return 'Consumer Secret should start with "cs_"';
        }
        return '';
    }, [consumerSecret, touched.consumerSecret, testAttempted]);

    if (isInitialLoad) {
        return (
            <Dialog open={true}>
                <DialogContent
                    hideClose
                    className="z-[var(--z-modal)] w-[100vw] max-w-none sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[var(--shadow-xl)]"
                >
                    <DialogTitle className="sr-only">Loading setup</DialogTitle>
                    <div className="p-6 sm:p-8">
                        <IntegrationSkeleton type="woocommerce" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const canTest = Boolean(storeUrl && consumerKey && consumerSecret && isValidUrl(storeUrl));

    const pasteFromClipboard = async (onPaste: (value: string) => void, field: keyof typeof touched) => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) {
                addToast('Clipboard is empty', 'warning');
                return;
            }
            onPaste(text.trim());
            setTouched(prev => ({ ...prev, [field]: true }));
            setClipboardSuccess(field);
            addToast('Pasted from clipboard', 'success');
            setTimeout(() => setClipboardSuccess(null), 2000);
        } catch {
            addToast('Clipboard access was blocked', 'error');
        }
    };

    const handleTest = () => {
        setTestAttempted(true);

        if (!storeUrl || !consumerKey || !consumerSecret || !isValidUrl(storeUrl)) {
            addToast('Please fix the highlighted fields', 'error');
            return;
        }

        const fullUrl = storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`;
        const credentials: WooCommerceCredentials = {
            type: 'WOOCOMMERCE',
            siteUrl: fullUrl,
            consumerKey,
            consumerSecret,
        };

        testConnection({
            type: 'WOOCOMMERCE',
            credentials,
        }, {
            onSuccess: (data) => {
                setTestResult(data);
                if (data.storeName) {
                    setStoreName(data.storeName);
                }
                setLastTestedAt(formatTestedAt(new Date()));
                addToast('Connection verified successfully!', 'success');
            },
            onError: (err: any) => {
                const parsedError = parseIntegrationError(err);
                setTestResult({ success: false, message: parsedError.message, error: parsedError });
                setLastTestedAt(null);

                // Enhanced error with retry suggestion
                addToast(formatErrorMessage(parsedError, 'WOOCOMMERCE'), 'error');
            }
        });
    };

    const handleSubmit = () => {
        if (!testResult?.success) {
            addToast('Please test the connection first', 'warning');
            return;
        }

        const fullUrl = storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`;
        const credentials: WooCommerceCredentials = {
            type: 'WOOCOMMERCE',
            siteUrl: fullUrl,
            consumerKey,
            consumerSecret,
        };

        const fieldMapping: FieldMapping = {
            orderNumber: 'number',
            orderDate: 'date_created',
            orderTotal: 'total',
            paymentMethod: 'payment_method_title',
            customerName: 'billing.first_name + billing.last_name',
            customerEmail: 'billing.email',
            customerPhone: 'billing.phone',
            shippingAddress1: 'shipping.address_1',
            shippingAddress2: 'shipping.address_2',
            shippingCity: 'shipping.city',
            shippingState: 'shipping.state',
            shippingPincode: 'shipping.postcode',
            shippingCountry: 'shipping.country',
            productSku: 'line_items[].sku',
            productName: 'line_items[].name',
            productQuantity: 'line_items[].quantity',
            productPrice: 'line_items[].price',
            productWeight: 'line_items[].weight',
        };

        createIntegration({
            type: 'WOOCOMMERCE',
            name: storeName || new URL(fullUrl).hostname,
            storeName: storeName || new URL(fullUrl).hostname,
            storeUrl: fullUrl,
            credentials,
            settings: settings as IntegrationSettings,
            fieldMapping,
        }, {
            onSuccess: () => {
                addToast('WooCommerce store connected successfully!', 'success');
                clearDraft();
                router.push('/seller/integrations');
            },
            onError: (err) => {
                addToast(err.message || 'Failed to connect store', 'error');
            }
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && router.back()}>
            <DialogContent
                hideClose
                overlayClassName="bg-black/60 backdrop-blur-sm z-[var(--z-modal-backdrop)] data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                className="z-[var(--z-modal)] w-[100vw] max-w-none sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[var(--shadow-xl)] flex flex-col gap-0"
            >
                <button
                    onClick={() => router.back()}
                    className="absolute right-4 top-4 p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-10"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-premium">
                    <div className="flex items-center gap-6 mb-6 pb-6 border-b border-[var(--border-subtle)]">
                        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#96588A]/10 to-[#96588A]/5 flex items-center justify-center flex-shrink-0 border border-[#96588A]/20 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-40 animate-pulse" />
                            <img
                                src="/logos/woocommerce.svg"
                                alt="WooCommerce"
                                className="w-12 h-12 relative"
                            />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <DialogTitle className="text-2xl font-bold text-[var(--text-primary)]">
                                    Connect WooCommerce Store
                                </DialogTitle>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Sync orders from your WordPress store
                            </p>
                            {isDraft && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--primary-blue)] font-medium animate-in fade-in slide-in-from-left-2">
                                    <Clock className="w-3 h-3" />
                                    <span>Draft saved automatically</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 mb-6">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                            <Info className="w-3.5 h-3.5" />
                            What you'll need
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-[var(--success)] mt-0.5" />
                                Store URL (yourstore.com)
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-[var(--success)] mt-0.5" />
                                WooCommerce REST API consumer key and secret
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                API Credentials
                            </h3>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                                        Store URL
                                    </label>
                                    <Tooltip content="Your WooCommerce store URL (e.g., yourstore.com)" side="right">
                                        <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                    </Tooltip>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        value={storeUrl}
                                        onChange={(e) => {
                                            setStoreUrl(e.target.value.trim());
                                            setTouched(prev => ({ ...prev, storeUrl: true }));
                                        }}
                                        onBlur={() => setTouched(prev => ({ ...prev, storeUrl: true }))}
                                        placeholder="yourstore.com"
                                        className={`pr-10 transition-all duration-200 ${validationStatus.storeUrl === 'valid' ? 'focus:ring-2 focus:ring-[var(--success)]/20' : validationStatus.storeUrl === 'invalid' ? 'focus:ring-2 focus:ring-[var(--error)]/20' : ''}`}
                                        autoFocus
                                        error={Boolean(storeUrlError)}
                                        aria-invalid={Boolean(storeUrlError)}
                                        aria-describedby="woo-store-url-hint woo-store-url-error"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {validationStatus.storeUrl === 'validating' && (
                                            <Loader2 className="w-3.5 h-3.5 text-[var(--text-muted)] animate-spin" />
                                        )}
                                        {validationStatus.storeUrl === 'valid' && (
                                            <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                        )}
                                    </div>
                                </div>
                                <p
                                    id="woo-store-url-hint"
                                    className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-1.5"
                                >
                                    <Info className="w-3.5 h-3.5" />
                                    We add `https://` automatically if omitted.
                                </p>
                                {storeUrlError && (
                                    <p id="woo-store-url-error" className="text-xs text-[var(--error-text)] animate-in slide-in-from-top-1 duration-200">
                                        {storeUrlError}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                                        Consumer Key
                                    </label>
                                    <Tooltip content="Find this in WooCommerce → Settings → Advanced → REST API" side="right">
                                        <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                    </Tooltip>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        value={consumerKey}
                                        onChange={(e) => {
                                            setConsumerKey(e.target.value.trim());
                                            setTouched(prev => ({ ...prev, consumerKey: true }));
                                        }}
                                        onBlur={() => setTouched(prev => ({ ...prev, consumerKey: true }))}
                                        placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        className={`font-mono text-xs pr-20 transition-all duration-200 ${validationStatus.consumerKey === 'valid' ? 'focus:ring-2 focus:ring-[var(--success)]/20' : validationStatus.consumerKey === 'invalid' ? 'focus:ring-2 focus:ring-[var(--error)]/20' : ''}`}
                                        error={Boolean(consumerKeyError)}
                                        aria-invalid={Boolean(consumerKeyError)}
                                        aria-describedby="woo-consumer-key-error"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        {validationStatus.consumerKey === 'valid' && (
                                            <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                        )}
                                        <div className="flex items-center gap-1">
                                            <span className="hidden sm:inline text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 mr-1">
                                                ⌘V
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => pasteFromClipboard(setConsumerKey, 'consumerKey')}
                                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                                                title="Paste from clipboard"
                                            >
                                                {clipboardSuccess === 'consumerKey' ? (
                                                    <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                                ) : (
                                                    <Clipboard className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {consumerKeyError && (
                                    <p id="woo-consumer-key-error" className="text-xs text-[var(--error-text)] animate-in slide-in-from-top-1 duration-200">
                                        {consumerKeyError}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                                        Consumer Secret
                                    </label>
                                    <Tooltip content="Find this in WooCommerce → Settings → Advanced → REST API" side="right">
                                        <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                    </Tooltip>
                                </div>
                                <Input
                                    type={showConsumerSecret ? 'text' : 'password'}
                                    value={consumerSecret}
                                    onChange={(e) => {
                                        setConsumerSecret(e.target.value.trim());
                                        setTouched(prev => ({ ...prev, consumerSecret: true }));
                                    }}
                                    onBlur={() => setTouched(prev => ({ ...prev, consumerSecret: true }))}
                                    placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className={`font-mono text-xs pr-20 transition-all duration-200 ${validationStatus.consumerSecret === 'valid' ? 'focus:ring-2 focus:ring-[var(--success)]/20' : validationStatus.consumerSecret === 'invalid' ? 'focus:ring-2 focus:ring-[var(--error)]/20' : ''}`}
                                    rightIcon={
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowConsumerSecret(prev => !prev)}
                                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                                aria-label={showConsumerSecret ? 'Hide consumer secret' : 'Show consumer secret'}
                                                aria-pressed={showConsumerSecret}
                                            >
                                                {showConsumerSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => pasteFromClipboard(setConsumerSecret, 'consumerSecret')}
                                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                                            >
                                                {clipboardSuccess === 'consumerSecret' ? (
                                                    <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                                ) : (
                                                    <Clipboard className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    }
                                    error={Boolean(consumerSecretError)}
                                    aria-invalid={Boolean(consumerSecretError)}
                                    aria-describedby="woo-consumer-secret-hint woo-consumer-secret-error"
                                />
                                <p id="woo-consumer-secret-hint" className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" />
                                    Secrets start with `cs_` and stay private.
                                </p>
                                {consumerSecretError && (
                                    <p id="woo-consumer-secret-error" className="text-xs text-[var(--error-text)] animate-in slide-in-from-top-1 duration-200">
                                        {consumerSecretError}
                                    </p>
                                )}
                            </div>

                            <Alert className="bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/20">
                                <AlertDescription className="text-xs text-[var(--text-secondary)]">
                                    Go to <strong>WooCommerce → Settings → Advanced → REST API</strong> to generate API keys
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={handleTest}
                                disabled={!canTest || isTesting}
                                className={testResult
                                    ? 'w-full border border-[#96588A]/40 text-[#7D4873] bg-transparent hover:bg-[#96588A]/10'
                                    : 'w-full bg-[#96588A] hover:bg-[#7D4873] text-white'
                                }
                                variant={testResult ? 'outline' : 'primary'}
                            >
                                {isTesting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Testing Connection...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        {testResult ? 'Test Again' : 'Test Connection'}
                                    </>
                                )}
                            </Button>

                            {testResult && (
                                <Alert className={`transition-all duration-300 ${testResult.success
                                    ? 'bg-[var(--success-bg)] border-[var(--success)]/30'
                                    : 'bg-[var(--error-bg)] border-[var(--error)]/30'
                                    }`}>
                                    {testResult.success ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                                            <AlertDescription className="text-sm text-[var(--text-primary)]">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span>
                                                        Connected to <strong>{storeName || storeUrl}</strong>
                                                    </span>
                                                    <Badge variant="success" size="sm">
                                                        Connected
                                                    </Badge>
                                                </div>
                                            </AlertDescription>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-4 h-4 text-[var(--error)]" />
                                            <AlertDescription className="text-sm w-full">
                                                <div className="space-y-2">
                                                    <p className="text-[var(--error-text)] font-medium">
                                                        {testResult.message}
                                                    </p>
                                                    {testResult.error?.suggestion && (
                                                        <p className="text-xs text-[var(--text-secondary)]">
                                                            {testResult.error.suggestion}
                                                        </p>
                                                    )}

                                                    {testResult.error?.retryable && (
                                                        <Button
                                                            onClick={handleTest}
                                                            disabled={isTesting}
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-2 text-xs h-7 w-full border-[var(--error)]/20 text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                                                        >
                                                            {isTesting ? 'Retrying...' : 'Retry Connection'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </AlertDescription>
                                        </>
                                    )}
                                </Alert>
                            )}

                            {lastTestedAt && (
                                <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Last tested {lastTestedAt}
                                </div>
                            )}
                        </div>

                        {testResult?.success && (
                            <>
                                <div className="space-y-4 pt-2">
                                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Sync Configuration
                                    </h3>

                                    <div className="space-y-2.5">
                                        <label className="block text-sm font-medium text-[var(--text-primary)]">
                                            Sync Frequency
                                        </label>
                                        <Select
                                            value={settings.syncFrequency}
                                            onChange={(e) => setSettings((prev: Partial<IntegrationSettings>) => ({
                                                ...prev,
                                                syncFrequency: e.target.value as SyncFrequency
                                            }))}
                                            options={syncFrequencyOptions}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                        <div className="flex-1 pr-4">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                Auto-update tracking
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                Push tracking to WooCommerce
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.autoTrackingUpdate}
                                            onCheckedChange={(checked) => setSettings((prev: Partial<IntegrationSettings>) => ({
                                                ...prev,
                                                autoTrackingUpdate: checked
                                            }))}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-[var(--border-subtle)] pt-4">
                                    <button
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="flex items-center justify-between w-full text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider"
                                    >
                                        Advanced Options
                                        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>

                                    {showAdvanced && (
                                        <div className="mt-4 space-y-3">
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                                <div className="flex-1 pr-4">
                                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                                        Import historical orders
                                                    </p>
                                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                                        Sync last 30 days
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={settings.syncHistoricalOrders}
                                                    onCheckedChange={(checked) => setSettings((prev: Partial<IntegrationSettings>) => ({
                                                        ...prev,
                                                        syncHistoricalOrders: checked
                                                    }))}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                                <div className="flex-1 pr-4">
                                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                                        Low inventory alerts
                                                    </p>
                                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                                        Email notifications
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={settings.notifications?.lowInventory}
                                                    onCheckedChange={(checked) => setSettings((prev: Partial<IntegrationSettings>) => ({
                                                        ...prev,
                                                        notifications: {
                                                            ...prev.notifications!,
                                                            lowInventory: checked
                                                        }
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex-1"
                            disabled={isCreating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isCreating || !testResult?.success}
                            className="flex-1 bg-[#96588A] hover:bg-[#7D4873] text-white"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Complete Setup
                                </>
                            )}
                        </Button>
                    </div>
                    {!testResult?.success && (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Test your WooCommerce connection to enable setup.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
