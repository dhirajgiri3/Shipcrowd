/**
 * Amazon Integration Setup (Modal)
 *
 * Beautiful modal-style integration for Amazon Seller Central
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
    AmazonCredentials,
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

const regionOptions = [
    { value: 'IN', label: 'India (amazon.in)' },
    { value: 'US', label: 'United States (amazon.com)' },
    { value: 'EU', label: 'Europe (amazon.eu)' },
    { value: 'JP', label: 'Japan (amazon.co.jp)' },
];

const regionDomains: Record<'IN' | 'US' | 'EU' | 'JP', string> = {
    IN: 'in',
    US: 'com',
    EU: 'eu',
    JP: 'co.jp',
};

const syncFrequencyOptions = [
    { value: 'HOURLY', label: 'Every hour' },
    { value: 'EVERY_30_MIN', label: 'Every 30 minutes' },
    { value: 'MANUAL', label: 'Manual sync only' },
];

const formatTestedAt = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);

export default function AmazonIntegrationPage() {
    const router = useRouter();
    const { addToast } = useToast();

    const defaultSettings: Partial<IntegrationSettings> = {
        syncFrequency: 'HOURLY',
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
        integrationType: 'AMAZON',
        initialState: {
            sellerId: '',
            mwsAuthToken: '',
            region: 'IN',
            settings: defaultSettings,
        },
        autoSave: true,
        autoSaveDelay: 500
    });

    const { sellerId, mwsAuthToken, region: rawRegion, settings: rawSettings } = formData;
    const region = rawRegion as 'IN' | 'US' | 'EU' | 'JP';
    const settings = rawSettings as Partial<IntegrationSettings>;

    const setSellerId = (val: string) => updateField('sellerId', val);
    const setMwsAuthToken = (val: string) => updateField('mwsAuthToken', val);
    const setRegion = (val: string) => updateField('region', val);

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
    const [showMwsToken, setShowMwsToken] = useState(false);
    const [storeName, setStoreName] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
    const [testAttempted, setTestAttempted] = useState(false);
    const [validationStatus, setValidationStatus] = useState<{
        sellerId: 'idle' | 'valid' | 'invalid';
        mwsAuthToken: 'idle' | 'valid' | 'invalid';
    }>({
        sellerId: 'idle',
        mwsAuthToken: 'idle',
    });
    const [isOnline, setIsOnline] = useState(true);
    const [clipboardSuccess, setClipboardSuccess] = useState<string | null>(null);
    const [touched, setTouched] = useState({
        sellerId: false,
        mwsAuthToken: false,
    });

    useEffect(() => {
        // Simulate initial checks
        const timer = setTimeout(() => setIsInitialLoad(false), 800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setTestResult(null);
        setLastTestedAt(null);
    }, [sellerId, mwsAuthToken, region]);

    // Seller ID Validation
    useEffect(() => {
        if (!sellerId) {
            setValidationStatus(prev => ({ ...prev, sellerId: 'idle' }));
            return;
        }
        // Amazon Seller IDs are typically alphanumeric, often start with A, approx 13-14 chars
        const isValid = /^[A-Z0-9]{10,20}$/.test(sellerId);
        setValidationStatus(prev => ({ ...prev, sellerId: isValid ? 'valid' : 'invalid' }));
    }, [sellerId]);

    // MWS Token Validation
    useEffect(() => {
        if (!mwsAuthToken) {
            setValidationStatus(prev => ({ ...prev, mwsAuthToken: 'idle' }));
            return;
        }
        const isValid = mwsAuthToken.startsWith('amzn.mws.');
        setValidationStatus(prev => ({ ...prev, mwsAuthToken: isValid ? 'valid' : 'invalid' }));
    }, [mwsAuthToken]);

    const sellerIdError = useMemo(() => {
        if (!sellerId) {
            return touched.sellerId || testAttempted ? 'Seller ID is required' : '';
        }
        return '';
    }, [sellerId, touched.sellerId, testAttempted]);

    const tokenError = useMemo(() => {
        if (!mwsAuthToken) {
            return touched.mwsAuthToken || testAttempted ? 'MWS auth token is required' : '';
        }
        return '';
    }, [mwsAuthToken, touched.mwsAuthToken, testAttempted]);

    if (isInitialLoad) {
        return (
            <Dialog open={true}>
                <DialogContent
                    hideClose
                    className="z-[var(--z-modal)] w-[100vw] max-w-none sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[var(--shadow-xl)]"
                >
                    <DialogTitle className="sr-only">Loading setup</DialogTitle>
                    <div className="p-6 sm:p-8">
                        <IntegrationSkeleton type="amazon" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const canTest = Boolean(sellerId && mwsAuthToken);

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

        if (!sellerId || !mwsAuthToken) {
            addToast('Please fix the highlighted fields', 'error');
            return;
        }

        const credentials: AmazonCredentials = {
            type: 'AMAZON',
            sellerId,
            mwsAuthToken,
            region,
        };

        testConnection({
            type: 'AMAZON',
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
                addToast(formatErrorMessage(parsedError, 'AMAZON'), 'error');
            }
        });
    };

    const handleSubmit = () => {
        if (!testResult?.success) {
            addToast('Please test the connection first', 'warning');
            return;
        }

        const credentials: AmazonCredentials = {
            type: 'AMAZON',
            sellerId,
            mwsAuthToken,
            region,
        };

        const fieldMapping: FieldMapping = {
            orderNumber: 'AmazonOrderId',
            orderDate: 'PurchaseDate',
            orderTotal: 'OrderTotal.Amount',
            paymentMethod: 'PaymentMethod',
            customerName: 'BuyerName',
            customerEmail: 'BuyerEmail',
            customerPhone: 'Phone',
            shippingAddress1: 'ShippingAddress.AddressLine1',
            shippingAddress2: 'ShippingAddress.AddressLine2',
            shippingCity: 'ShippingAddress.City',
            shippingState: 'ShippingAddress.StateOrRegion',
            shippingPincode: 'ShippingAddress.PostalCode',
            shippingCountry: 'ShippingAddress.CountryCode',
            productSku: 'OrderItems[].SellerSKU',
            productName: 'OrderItems[].Title',
            productQuantity: 'OrderItems[].QuantityOrdered',
            productPrice: 'OrderItems[].ItemPrice.Amount',
            productWeight: 'OrderItems[].Weight',
        };

        const domain = regionDomains[region];

        createIntegration({
            type: 'AMAZON',
            name: storeName || `Amazon ${region}`,
            storeName: storeName || `Amazon ${region}`,
            storeUrl: `https://sellercentral.amazon.${domain}`,
            credentials,
            settings: settings as IntegrationSettings,
            fieldMapping,
        }, {
            onSuccess: () => {
                addToast('Amazon store connected successfully!', 'success');
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
                        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF9900]/10 to-[#FF9900]/5 flex items-center justify-center flex-shrink-0 border border-[#FF9900]/20 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-40 animate-pulse" />
                            <img
                                src="/logos/amazon.svg"
                                alt="Amazon"
                                className="w-12 h-12 relative"
                            />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <DialogTitle className="text-2xl font-bold text-[var(--text-primary)]">
                                    Connect Amazon Seller
                                </DialogTitle>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Sync orders from Amazon Seller Central
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
                                Seller ID and MWS auth token
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-[var(--success)] mt-0.5" />
                                Marketplace region (India, US, EU, or Japan)
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                Seller Credentials
                            </h3>

                            <div className="space-y-2.5">
                                <label className="block text-sm font-medium text-[var(--text-primary)]">
                                    Marketplace Region
                                </label>
                                <Select
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value as any)}
                                    options={regionOptions}
                                />
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                                        Seller ID
                                    </label>
                                    <Tooltip content="Your 13-14 character Merchant/Seller ID" side="right">
                                        <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                    </Tooltip>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        value={sellerId}
                                        onChange={(e) => {
                                            setSellerId(e.target.value.trim().toUpperCase());
                                            setTouched(prev => ({ ...prev, sellerId: true }));
                                        }}
                                        onBlur={() => setTouched(prev => ({ ...prev, sellerId: true }))}
                                        placeholder="A1XXXXXXXXX"
                                        className={`font-mono uppercase transition-all duration-200 pr-20 ${validationStatus.sellerId === 'valid' ? 'focus:ring-2 focus:ring-[var(--success)]/20' : validationStatus.sellerId === 'invalid' ? 'focus:ring-2 focus:ring-[var(--error)]/20' : ''}`}
                                        autoFocus
                                        error={Boolean(sellerIdError)}
                                        aria-invalid={Boolean(sellerIdError)}
                                        aria-describedby="amazon-seller-id-hint amazon-seller-id-error"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        {validationStatus.sellerId === 'valid' && (
                                            <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => pasteFromClipboard(setSellerId, 'sellerId')}
                                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                                        >
                                            {clipboardSuccess === 'sellerId' ? (
                                                <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                            ) : (
                                                <Clipboard className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                {sellerIdError && (
                                    <p id="amazon-seller-id-error" className="text-xs text-[var(--error-text)] animate-in slide-in-from-top-1 duration-200">
                                        {sellerIdError}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                                        MWS Auth Token
                                    </label>
                                    <Tooltip content="Begins with amzn.mws...." side="right">
                                        <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                    </Tooltip>
                                </div>
                                <Input
                                    type={showMwsToken ? 'text' : 'password'}
                                    value={mwsAuthToken}
                                    onChange={(e) => {
                                        setMwsAuthToken(e.target.value.trim());
                                        setTouched(prev => ({ ...prev, mwsAuthToken: true }));
                                    }}
                                    onBlur={() => setTouched(prev => ({ ...prev, mwsAuthToken: true }))}
                                    placeholder="amzn.mws.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className={`font-mono text-xs pr-20 transition-all duration-200 ${validationStatus.mwsAuthToken === 'valid' ? 'focus:ring-2 focus:ring-[var(--success)]/20' : validationStatus.mwsAuthToken === 'invalid' ? 'focus:ring-2 focus:ring-[var(--error)]/20' : ''}`}
                                    rightIcon={
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowMwsToken(prev => !prev)}
                                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                                aria-label={showMwsToken ? 'Hide auth token' : 'Show auth token'}
                                                aria-pressed={showMwsToken}
                                            >
                                                {showMwsToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => pasteFromClipboard(setMwsAuthToken, 'mwsAuthToken')}
                                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                                            >
                                                {clipboardSuccess === 'mwsAuthToken' ? (
                                                    <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                                ) : (
                                                    <Clipboard className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    }
                                    error={Boolean(tokenError)}
                                    aria-invalid={Boolean(tokenError)}
                                    aria-describedby="amazon-token-hint amazon-token-error"
                                />
                                <p id="amazon-token-hint" className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" />
                                    Found in Settings → User Permissions → Third Party Apps.
                                </p>
                                {tokenError && (
                                    <p id="amazon-token-error" className="text-xs text-[var(--error-text)] animate-in slide-in-from-top-1 duration-200">
                                        {tokenError}
                                    </p>
                                )}
                            </div>

                            <Alert className="bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/20">
                                <AlertDescription className="text-xs text-[var(--text-secondary)]">
                                    Find your Seller ID and MWS token in <strong>Settings → User Permissions → Third Party Apps</strong>
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={handleTest}
                                disabled={!canTest || isTesting}
                                className={testResult
                                    ? 'w-full h-11 sm:h-12 border border-[#FF9900]/40 text-[#E68A00] bg-transparent hover:bg-[#FF9900]/10'
                                    : 'w-full h-11 sm:h-12 bg-[#FF9900] hover:bg-[#E68A00] text-white'
                                }
                                variant={testResult ? 'outline' : 'primary'}
                            >
                                {isTesting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Testing Connection...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>{testResult ? 'Test Again' : 'Test Connection'}</span>
                                    </div>
                                )}
                            </Button>

                            {testResult && (
                                <Alert className={testResult.success
                                    ? 'bg-[var(--success-bg)] border-[var(--success)]/30'
                                    : 'bg-[var(--error-bg)] border-[var(--error)]/30'
                                }>
                                    {testResult.success ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                                            <AlertDescription className="text-sm text-[var(--text-primary)]">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span>
                                                        Connected to <strong>{storeName || `Amazon ${region}`}</strong>
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
                                                Push tracking to Amazon
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
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex-1 sm:flex-initial sm:min-w-[140px] h-11 sm:h-12"
                            disabled={isCreating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isCreating || !testResult?.success}
                            className="flex-1 h-11 sm:h-12 bg-[#FF9900] hover:bg-[#E68A00] text-white font-medium"
                        >
                            {isCreating ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Saving Integration...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Complete Setup</span>
                                </div>
                            )}
                        </Button>
                    </div>
                    {!testResult?.success && (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Test your Amazon connection to enable setup.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
