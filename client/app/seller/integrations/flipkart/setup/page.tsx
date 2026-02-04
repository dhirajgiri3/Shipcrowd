/**
 * Flipkart Integration Setup (Modal)
 *
 * Beautiful modal-style integration for Flipkart Seller
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
    FlipkartCredentials,
    SyncFrequency,
} from '@/src/types/api/integrations';

// Shared Components
import { Input } from '@/src/components/ui/core/Input';
import { Button } from '@/src/components/ui/core/Button';
import { Select } from '@/src/components/ui/form/Select';
import { Switch } from '@/src/components/ui/core/Switch';
import { Textarea } from '@/src/components/ui/core/Textarea';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { Badge } from '@/src/components/ui/core/Badge';
import { Dialog, DialogContent, DialogTitle } from '@/src/components/ui/feedback/Dialog';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';
import { IntegrationSkeleton } from '@/src/components/ui/feedback/IntegrationSkeleton';

const syncFrequencyOptions = [
    { value: 'EVERY_15_MIN', label: 'Every 15 minutes' },
    { value: 'HOURLY', label: 'Every hour' },
    { value: 'MANUAL', label: 'Manual sync only' },
];

const formatTestedAt = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);

export default function FlipkartIntegrationPage() {
    const router = useRouter();
    const { addToast } = useToast();

    const defaultSettings: Partial<IntegrationSettings> = {
        syncFrequency: 'EVERY_15_MIN',
        autoFulfill: false,
        autoTrackingUpdate: true,
        syncHistoricalOrders: false,
        orderFilters: {},
        notifications: {
            syncErrors: true,
            connectionIssues: true,
            lowInventory: false,
        },
    };

    const {
        formData,
        updateField,
        clearDraft,
        isDraft,
        saveDraft
    } = useIntegrationState({
        integrationType: 'FLIPKART',
        initialState: {
            appId: '',
            appSecret: '',
            accessToken: '',
            settings: defaultSettings,
        },
        autoSave: true,
        autoSaveDelay: 500
    });

    const { appId, appSecret, accessToken, settings: rawSettings } = formData;

    // Explicitly type settings to avoid lint errors
    const settings = rawSettings as Partial<IntegrationSettings>;

    const setAppId = (val: string) => updateField('appId', val);
    const setAppSecret = (val: string) => updateField('appSecret', val);
    const setAccessToken = (val: string) => updateField('accessToken', val);

    const setSettings = (val: Partial<IntegrationSettings> | ((prev: Partial<IntegrationSettings>) => Partial<IntegrationSettings>)) => {
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
    // Move local state declarations here that were removed from the large block above but are still needed
    const [showAppSecret, setShowAppSecret] = useState(false);
    const [showAccessToken, setShowAccessToken] = useState(false);
    const [storeName, setStoreName] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
    const [testAttempted, setTestAttempted] = useState(false);
    const [validationStatus, setValidationStatus] = useState<{
        appId: 'idle' | 'valid' | 'invalid';
        appSecret: 'idle' | 'valid' | 'invalid';
        accessToken: 'idle' | 'valid' | 'invalid';
    }>({
        appId: 'idle',
        appSecret: 'idle',
        accessToken: 'idle',
    });
    const [isOnline, setIsOnline] = useState(true);
    const [clipboardSuccess, setClipboardSuccess] = useState<string | null>(null);
    const [touched, setTouched] = useState({
        appId: false,
        appSecret: false,
        accessToken: false,
    });

    useEffect(() => {
        // Simulate initial checks
        const timer = setTimeout(() => setIsInitialLoad(false), 800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setTestResult(null);
        setLastTestedAt(null);
    }, [appId, appSecret, accessToken]);

    // Validation Hooks
    useEffect(() => {
        if (!appId) {
            setValidationStatus(prev => ({ ...prev, appId: 'idle' }));
            return;
        }
        setValidationStatus(prev => ({ ...prev, appId: appId.length > 5 ? 'valid' : 'invalid' }));
    }, [appId]);

    useEffect(() => {
        if (!appSecret) {
            setValidationStatus(prev => ({ ...prev, appSecret: 'idle' }));
            return;
        }
        setValidationStatus(prev => ({ ...prev, appSecret: appSecret.length > 10 ? 'valid' : 'invalid' }));
    }, [appSecret]);

    useEffect(() => {
        if (!accessToken) {
            setValidationStatus(prev => ({ ...prev, accessToken: 'idle' }));
            return;
        }
        setValidationStatus(prev => ({ ...prev, accessToken: accessToken.length > 20 ? 'valid' : 'invalid' }));
    }, [accessToken]);

    const appIdError = useMemo(() => {
        if (!appId) {
            return touched.appId || testAttempted ? 'App ID is required' : '';
        }
        return '';
    }, [appId, touched.appId, testAttempted]);

    const appSecretError = useMemo(() => {
        if (!appSecret) {
            return touched.appSecret || testAttempted ? 'App Secret is required' : '';
        }
        return '';
    }, [appSecret, touched.appSecret, testAttempted]);

    const accessTokenError = useMemo(() => {
        if (!accessToken) {
            return touched.accessToken || testAttempted ? 'Access Token is required' : '';
        }
        return '';
    }, [accessToken, touched.accessToken, testAttempted]);

    if (isInitialLoad) {
        return (
            <Dialog open={true}>
                <DialogContent
                    hideClose
                    className="z-[var(--z-modal)] w-[100vw] max-w-none sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[var(--shadow-xl)]"
                >
                    <DialogTitle className="sr-only">Loading setup</DialogTitle>
                    <div className="p-6 sm:p-8">
                        <IntegrationSkeleton type="flipkart" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const canTest = Boolean(appId && appSecret && accessToken);

    const pasteFromClipboard = async (onPaste: (value: string) => void, field: keyof typeof touched) => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) {
                addToast('Clipboard is empty', 'warning');
                return;
            }
            onPaste(text.trim());
            setTouched(prev => ({ ...prev, [field]: true }));
            addToast('Pasted from clipboard', 'success');
        } catch {
            addToast('Clipboard access was blocked', 'error');
        }
    };

    const handleTest = () => {
        setTestAttempted(true);

        if (!appId || !appSecret || !accessToken) {
            addToast('Please fix the highlighted fields', 'error');
            return;
        }

        const credentials: FlipkartCredentials = {
            type: 'FLIPKART',
            appId,
            appSecret,
            accessToken,
        };

        testConnection({
            type: 'FLIPKART',
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
                addToast(formatErrorMessage(parsedError, 'FLIPKART'), 'error');
            }
        });
    };

    const handleSubmit = () => {
        if (!testResult?.success) {
            addToast('Please test the connection first', 'warning');
            return;
        }

        const credentials: FlipkartCredentials = {
            type: 'FLIPKART',
            appId,
            appSecret,
            accessToken,
        };

        const fieldMapping: FieldMapping = {
            orderNumber: 'orderId',
            orderDate: 'orderDate',
            orderTotal: 'totalPrice',
            paymentMethod: 'paymentType',
            customerName: 'shippingAddress.name',
            customerEmail: 'shippingAddress.email',
            customerPhone: 'shippingAddress.phone',
            shippingAddress1: 'shippingAddress.addressLine1',
            shippingAddress2: 'shippingAddress.addressLine2',
            shippingCity: 'shippingAddress.city',
            shippingState: 'shippingAddress.state',
            shippingPincode: 'shippingAddress.pincode',
            shippingCountry: 'shippingAddress.country',
            productSku: 'orderItems[].sku',
            productName: 'orderItems[].title',
            productQuantity: 'orderItems[].quantity',
            productPrice: 'orderItems[].sellingPrice',
            productWeight: 'orderItems[].weight',
        };

        createIntegration({
            type: 'FLIPKART',
            name: storeName || 'Flipkart Store',
            storeName: storeName || 'Flipkart Store',
            storeUrl: 'https://seller.flipkart.com',
            credentials,
            settings: settings as IntegrationSettings,
            fieldMapping,
        }, {
            onSuccess: () => {
                addToast('Flipkart seller account connected successfully!', 'success');
                clearDraft();
                router.push('/seller/integrations');
            },
            onError: (err) => {
                addToast(err.message || 'Failed to connect seller account', 'error');
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
                        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2874F0]/10 to-[#2874F0]/5 flex items-center justify-center flex-shrink-0 border border-[#2874F0]/20 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-40 animate-pulse" />
                            <img
                                src="/logos/flipkart.png"
                                alt="Flipkart"
                                className="w-12 h-12 object-contain relative"
                            />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <DialogTitle className="text-2xl font-bold text-[var(--text-primary)]">
                                    Connect Flipkart Seller
                                </DialogTitle>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Sync orders from your Flipkart seller account
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
                                Flipkart app ID and app secret
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-[var(--success)] mt-0.5" />
                                Seller Hub access token
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
                                        App ID
                                    </label>
                                    <Tooltip content="Your Flipkart Application ID" side="right">
                                        <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                    </Tooltip>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        value={appId}
                                        onChange={(e) => {
                                            setAppId(e.target.value.trim());
                                            setTouched(prev => ({ ...prev, appId: true }));
                                        }}
                                        onBlur={() => setTouched(prev => ({ ...prev, appId: true }))}
                                        placeholder="your-app-id"
                                        className={`font-mono text-sm pr-20 transition-all duration-200 ${validationStatus.appId === 'valid' ? 'focus:ring-2 focus:ring-[var(--success)]/20' : validationStatus.appId === 'invalid' ? 'focus:ring-2 focus:ring-[var(--error)]/20' : ''}`}
                                        autoFocus
                                        error={Boolean(appIdError)}
                                        aria-invalid={Boolean(appIdError)}
                                        aria-describedby="flipkart-app-id-hint flipkart-app-id-error"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        {validationStatus.appId === 'valid' && (
                                            <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => pasteFromClipboard(setAppId, 'appId')}
                                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                                        >
                                            {clipboardSuccess === 'appId' ? (
                                                <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                            ) : (
                                                <Clipboard className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                {appIdError && (
                                    <p id="flipkart-app-id-error" className="text-xs text-[var(--error-text)] animate-in slide-in-from-top-1 duration-200">
                                        {appIdError}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                                        App Secret
                                    </label>
                                    <Tooltip content="Your secret key for API authentication" side="right">
                                        <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                    </Tooltip>
                                </div>
                                <Input
                                    type={showAppSecret ? 'text' : 'password'}
                                    value={appSecret}
                                    onChange={(e) => {
                                        setAppSecret(e.target.value.trim());
                                        setTouched(prev => ({ ...prev, appSecret: true }));
                                    }}
                                    onBlur={() => setTouched(prev => ({ ...prev, appSecret: true }))}
                                    placeholder="your-app-secret"
                                    className={`font-mono text-sm pr-20 transition-all duration-200 ${validationStatus.appSecret === 'valid' ? 'focus:ring-2 focus:ring-[var(--success)]/20' : validationStatus.appSecret === 'invalid' ? 'focus:ring-2 focus:ring-[var(--error)]/20' : ''}`}
                                    rightIcon={
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowAppSecret(prev => !prev)}
                                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                                aria-label={showAppSecret ? 'Hide app secret' : 'Show app secret'}
                                                aria-pressed={showAppSecret}
                                            >
                                                {showAppSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => pasteFromClipboard(setAppSecret, 'appSecret')}
                                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                                            >
                                                {clipboardSuccess === 'appSecret' ? (
                                                    <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                                ) : (
                                                    <Clipboard className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    }
                                    error={Boolean(appSecretError)}
                                    aria-invalid={Boolean(appSecretError)}
                                    aria-describedby="flipkart-app-secret-hint flipkart-app-secret-error"
                                />
                                <p id="flipkart-app-secret-hint" className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" />
                                    Keep this secret safe and private.
                                </p>
                                {appSecretError && (
                                    <p id="flipkart-app-secret-error" className="text-xs text-[var(--error-text)] animate-in slide-in-from-top-1 duration-200">
                                        {appSecretError}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <label className="block text-sm font-medium text-[var(--text-primary)]">
                                            Access Token
                                        </label>
                                        <Tooltip content="Long-lived token for API access" side="right">
                                            <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                        </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowAccessToken(prev => !prev)}
                                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                                            aria-label={showAccessToken ? 'Hide access token' : 'Show access token'}
                                            aria-pressed={showAccessToken}
                                        >
                                            {showAccessToken ? (
                                                <><EyeOff className="w-3.5 h-3.5" /> Hide</>
                                            ) : (
                                                <><Eye className="w-3.5 h-3.5" /> Show</>
                                            )}
                                        </button>
                                        <div className="w-px h-3 bg-[var(--border-subtle)]" />
                                        <button
                                            type="button"
                                            onClick={() => pasteFromClipboard(setAccessToken, 'accessToken')}
                                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                                            aria-label="Paste access token"
                                        >
                                            {clipboardSuccess === 'accessToken' ? (
                                                <><Check className="w-3.5 h-3.5 text-[var(--success)]" /> Copied</>
                                            ) : (
                                                <><Clipboard className="w-3.5 h-3.5" /> Paste</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Textarea
                                        value={accessToken}
                                        onChange={(e) => {
                                            setAccessToken(e.target.value.trim());
                                            setTouched(prev => ({ ...prev, accessToken: true }));
                                        }}
                                        onBlur={() => setTouched(prev => ({ ...prev, accessToken: true }))}
                                        placeholder="Paste your access token here"
                                        className={`font-mono text-xs resize-none transition-all duration-200 ${validationStatus.accessToken === 'valid' ? 'focus:ring-2 focus:ring-[var(--success)]/20' : validationStatus.accessToken === 'invalid' ? 'focus:ring-2 focus:ring-[var(--error)]/20' : ''} ${accessTokenError ? 'border-[var(--border-error)] focus-visible:ring-[var(--error-light)]' : ''}`}
                                        rows={3}
                                        style={{ WebkitTextSecurity: showAccessToken ? 'none' : 'disc' } as React.CSSProperties}
                                        aria-invalid={Boolean(accessTokenError)}
                                        aria-describedby="flipkart-access-token-hint flipkart-access-token-error"
                                    />
                                    {validationStatus.accessToken === 'valid' && (
                                        <div className="absolute right-3 bottom-3">
                                            <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                        </div>
                                    )}
                                </div>
                                <p id="flipkart-access-token-hint" className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" />
                                    Tokens expire periodically; refresh from Seller Hub.
                                </p>
                                {accessTokenError && (
                                    <p id="flipkart-access-token-error" className="text-xs text-[var(--error-text)] animate-in slide-in-from-top-1 duration-200">
                                        {accessTokenError}
                                    </p>
                                )}
                            </div>

                            <Alert className="bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/20">
                                <AlertDescription className="text-xs text-[var(--text-secondary)]">
                                    Get your API credentials from <strong>Flipkart Seller Hub → API Settings</strong>
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={handleTest}
                                disabled={!canTest || isTesting}
                                className={testResult
                                    ? 'w-full border border-[#2874F0]/40 text-[#1F5FCC] bg-transparent hover:bg-[#2874F0]/10'
                                    : 'w-full bg-[#2874F0] hover:bg-[#1F5FCC] text-white'
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
                                                        Connected to <strong>{storeName || 'Flipkart Seller'}</strong>
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
                                            onChange={(e) => setSettings(prev => ({
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
                                                Push tracking to Flipkart
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.autoTrackingUpdate}
                                            onCheckedChange={(checked) => setSettings(prev => ({
                                                ...prev,
                                                autoTrackingUpdate: checked
                                            }))}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                        <div className="flex-1 pr-4">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                Sync error notifications
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                Email when sync fails
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.notifications?.syncErrors}
                                            onCheckedChange={(checked) => setSettings(prev => ({
                                                ...prev,
                                                notifications: {
                                                    ...prev.notifications!,
                                                    syncErrors: checked
                                                }
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
                                                    onCheckedChange={(checked) => setSettings(prev => ({
                                                        ...prev,
                                                        syncHistoricalOrders: checked
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
                            className="flex-1 bg-[#2874F0] hover:bg-[#1F5FCC] text-white"
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
                            Test your Flipkart connection to enable setup.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
