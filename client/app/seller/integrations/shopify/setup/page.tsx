/**
 * Shopify Integration Setup (Modal)
 *
 * Beautiful modal-style integration flow with proper branding
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    useInitiateOAuth,
    useTestConnection,
    useCreateIntegration,
    useIntegrations,
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
    Clock,
    ExternalLink,
    HelpCircle,
    Info,
    Loader2,
    RefreshCw,
    Settings,
    ShieldCheck,
    X,
} from 'lucide-react';
import type {
    IntegrationSettings,
    FieldMapping,
    ShopifyCredentials,
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
    { value: 'REALTIME', label: 'Real-time (via webhooks)' },
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

export default function ShopifyIntegrationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToast } = useToast();

    // Component-specific state (not managed by form hook)
    const [storeName, setStoreName] = useState('');
    const [storeId, setStoreId] = useState<string>(''); // Store ID from OAuth callback
    const [accessToken, setAccessToken] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
    const [domainTouched, setDomainTouched] = useState(false);
    const [connectAttempted, setConnectAttempted] = useState(false);
    const [testAttempted, setTestAttempted] = useState(false);
    const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
    const [isOnline, setIsOnline] = useState(true);

    const defaultSettings: Partial<IntegrationSettings> = {
        syncFrequency: 'REALTIME',
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
        integrationType: 'SHOPIFY',
        initialState: {
            shopDomain: '',
            settings: defaultSettings,
        },
        autoSave: true, // Enable auto-save
        autoSaveDelay: 500
    });

    // Access form data through formData object
    const shopDomain = formData.shopDomain as string;
    const settings = (formData.settings || defaultSettings) as Partial<IntegrationSettings>;

    const setShopDomain = (val: string) => updateField('shopDomain', val);
    const setSettings = (val: any) => {
        if (typeof val === 'function') {
            const newSettings = val(formData.settings || defaultSettings);
            updateField('settings', { ...defaultSettings, ...newSettings });
        } else {
            updateField('settings', { ...defaultSettings, ...val });
        }
    };

    const { mutate: initiateOAuth, isPending: isInitiating } = useInitiateOAuth();
    const { mutate: testConnection, isPending: isTesting } = useTestConnection();
    const { mutate: createIntegration, isPending: isCreating } = useCreateIntegration();

    const processedParamsRef = React.useRef(false);

    useEffect(() => {
        const status = searchParams.get('status');
        const store = searchParams.get('shop') || searchParams.get('store');
        const id = searchParams.get('storeId'); // Get storeId from callback
        const message = searchParams.get('message');

        if (status === 'success' && store) {
            if (processedParamsRef.current) return;
            processedParamsRef.current = true;

            setIsAuthenticated(true);
            setShopDomain(store);
            setStoreName(store.replace('.myshopify.com', ''));
            if (id) setStoreId(id); // Save storeId for test connection
            addToast('Successfully connected to Shopify!', 'success');
            
            // Clear search params without full reload
            const url = new URL(window.location.href);
            url.search = '';
            window.history.replaceState({}, '', url.toString());
        } else if (status === 'error') {
            if (processedParamsRef.current) return;
            processedParamsRef.current = true;

            addToast(message || 'Shopify connection failed', 'error');
            
            // Clear search params without full reload
            const url = new URL(window.location.href);
            url.search = '';
            window.history.replaceState({}, '', url.toString());
        }
    }, [searchParams, addToast, setShopDomain, setStoreId]);

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
    // In a real app we might also check for existing integration data here
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [existingIntegration, setExistingIntegration] = useState<any>(null);

    const { data: integrations, isLoading: isLoadingIntegrations } = useIntegrations({ type: 'SHOPIFY' });

    useEffect(() => {
        if (integrations && integrations.length > 0) {
            // Find if this shop is already integrated
            const shop = searchParams.get('shop') || searchParams.get('store');
            const existing = shop 
                ? (integrations as any[]).find((i: any) => i.shopDomain === shop || i.shopDomain === `${shop}.myshopify.com` || i.storeUrl?.includes(shop))
                : (integrations as any[])[0]; // Default to first one if no shop in URL
            
            if (existing) {
                setExistingIntegration(existing);
                setIsAuthenticated(true);
                setShopDomain(existing.shopDomain || (existing.storeUrl?.replace('https://', '') || ''));
                setStoreName(existing.shopName || existing.storeName || (existing.shopDomain || '').replace('.myshopify.com', ''));
                setStoreId(existing.integrationId || existing.id || existing._id);
            }
        }
    }, [integrations, searchParams]);

    useEffect(() => {
        // Simulate initial checks
        if (!isLoadingIntegrations) {
            const timer = setTimeout(() => setIsInitialLoad(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isLoadingIntegrations]);

    useEffect(() => {
        setTestResult(null);
        setLastTestedAt(null);
    }, [shopDomain, accessToken]);

    // Real-time validation with debouncing
    useEffect(() => {
        if (!shopDomain) {
            setValidationStatus('idle');
            return;
        }

        setValidationStatus('validating');
        const timer = setTimeout(() => {
            const isValid = isValidDomain(shopDomain);
            setValidationStatus(isValid ? 'valid' : 'invalid');
        }, 300);

        return () => clearTimeout(timer);
    }, [shopDomain]);

    const isValidDomain = (domain: string) => {
        return domain.includes('.myshopify.com') || /^[a-zA-Z0-9-]+$/.test(domain);
    };

    const domainError = useMemo(() => {
        if (!shopDomain) {
            return domainTouched || connectAttempted ? 'Store domain is required' : '';
        }
        if (!isValidDomain(shopDomain)) {
            return 'Enter a valid Shopify store domain (e.g., your-store.myshopify.com)';
        }
        return '';
    }, [shopDomain, domainTouched, connectAttempted]);

    // Keyboard shortcut for paste
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            // Only trigger if no active input to avoid double paste
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            try {
                const text = await navigator.clipboard.readText();
                if (text && !shopDomain && !isAuthenticated) {
                    // Smart detection for shopify domain
                    if (text.includes('myshopify.com') || /^[a-zA-Z0-9-]+$/.test(text)) {
                        setShopDomain(text.trim());
                        addToast('Pasted from clipboard', 'info');
                    }
                }
            } catch (err) {
                // Clipboard access denied or empty
            }
        };

        // Listen for Cmd+V / Ctrl+V
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                // The actual paste event will follow, or we can trigger manual read if needed
                // But native simple paste might handle it if focused.
                // If NOT focused, we want to capture it.
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    navigator.clipboard.readText().then(text => {
                        if (text && !shopDomain && !isAuthenticated) {
                            if (text.includes('myshopify.com') || /^[a-zA-Z0-9-]+$/.test(text)) {
                                setShopDomain(text.trim());
                                addToast('Pasted domain from clipboard', 'info');
                            }
                        }
                    }).catch(() => { });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shopDomain, isAuthenticated, addToast]);

    if (isInitialLoad) {
        return (
            <Dialog open={true}>
                <DialogContent
                    hideClose
                    className="z-[var(--z-modal)] w-[100vw] max-w-none sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[var(--shadow-xl)]"
                >
                    <DialogTitle className="sr-only">Loading setup</DialogTitle>
                    <div className="p-6 sm:p-8">
                        <IntegrationSkeleton type="shopify" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const handleConnect = () => {
        setConnectAttempted(true);
        if (!shopDomain || !isValidDomain(shopDomain)) {
            addToast('Please enter a valid Shopify store domain', 'error');
            return;
        }

        const fullDomain = shopDomain.includes('.myshopify.com')
            ? shopDomain
            : `${shopDomain}.myshopify.com`;

        initiateOAuth({
            type: 'SHOPIFY',
            shop: fullDomain,
        }, {
            onSuccess: (data) => {
                if (data.authUrl) {
                    window.location.href = data.authUrl;
                }
            },
            onError: (err: any) => {
                addToast(err.message || 'Failed to connect to Shopify', 'error');
            }
        });
    };

    const handleTest = () => {
        setTestAttempted(true);
        if (!shopDomain || !isValidDomain(shopDomain)) {
            addToast('Please enter a valid Shopify store domain', 'error');
            return;
        }

        const credentials: ShopifyCredentials = {
            type: 'SHOPIFY',
            shopDomain,
            accessToken: accessToken || 'connected',
        };

        testConnection({
            type: 'SHOPIFY',
            credentials,
            integrationId: storeId, // Pass storeId to use the correct endpoint
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
                addToast(formatErrorMessage(parsedError, 'SHOPIFY'), 'error');
            }
        });
    };

    const handleSubmit = () => {
        if (!testResult?.success) {
            addToast('Please test the connection first', 'warning');
            return;
        }

        // If store already exists (from existing integration), just navigate to it
        if (existingIntegration && storeId) {
            addToast('Store already connected!', 'success');
            clearDraft();
            router.push(`/seller/integrations/shopify/${storeId}`);
            return;
        }

        const credentials: ShopifyCredentials = {
            type: 'SHOPIFY',
            shopDomain,
            accessToken: accessToken || 'connected',
        };

        const fieldMapping: FieldMapping = {
            orderNumber: 'order_number',
            orderDate: 'created_at',
            orderTotal: 'total_price',
            paymentMethod: 'payment_gateway_names[0]',
            customerName: 'customer.name',
            customerEmail: 'customer.email',
            customerPhone: 'customer.phone',
            shippingAddress1: 'shipping_address.address1',
            shippingAddress2: 'shipping_address.address2',
            shippingCity: 'shipping_address.city',
            shippingState: 'shipping_address.province',
            shippingPincode: 'shipping_address.zip',
            shippingCountry: 'shipping_address.country',
            productSku: 'line_items[].sku',
            productName: 'line_items[].name',
            productQuantity: 'line_items[].quantity',
            productPrice: 'line_items[].price',
            productWeight: 'line_items[].grams',
        };

        createIntegration({
            type: 'SHOPIFY',
            name: storeName || shopDomain,
            storeName: storeName || shopDomain,
            storeUrl: `https://${shopDomain}`,
            credentials,
            settings: settings as IntegrationSettings,
            fieldMapping,
        }, {
            onSuccess: (data: any) => {
                addToast('Shopify store connected successfully!', 'success');
                clearDraft();
                // Navigate to the newly created store page
                const newStoreId = data.integrationId || data._id || data.id;
                if (newStoreId) {
                    router.push(`/seller/integrations/shopify/${newStoreId}`);
                } else {
                    router.push('/seller/integrations');
                }
            },
            onError: (err: any) => {
                addToast(err.message || 'Failed to connect store', 'error');
            }
        });
    };

    const footerActions = isAuthenticated ? (
        <>
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
                className="flex-1 bg-[#95BF47] hover:bg-[#829F3C] text-white"
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
        </>
    ) : (
        <>
            <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
            >
                Cancel
            </Button>
            <Button
                onClick={handleConnect}
                disabled={!shopDomain || Boolean(domainError) || isInitiating}
                className="flex-1 bg-[#95BF47] hover:bg-[#829F3C] text-white"
            >
                {isInitiating ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Connect Store
                    </>
                )}
            </Button>
        </>
    );

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

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-premium">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 pb-6 border-b border-[var(--border-subtle)] text-center sm:text-left">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#95BF47]/10 to-[#95BF47]/5 flex items-center justify-center flex-shrink-0 border border-[#95BF47]/20 overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-40 animate-pulse" />
                            <img
                                src="/logos/shopify.svg"
                                alt="Shopify"
                                className="w-10 h-10 sm:w-12 sm:h-12 relative transition-transform duration-500 group-hover:scale-110"
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                                <DialogTitle className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] truncate">
                                    Connect Shopify Store
                                </DialogTitle>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] text-balance">
                                Sync orders automatically in real-time with webhooks
                            </p>
                            {isDraft && (
                                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-xs text-[var(--primary-blue)] font-medium animate-in fade-in slide-in-from-left-2">
                                    <Clock className="w-3 h-3" />
                                    <span>Draft saved automatically</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 sm:p-4 mb-6">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            What you'll need
                        </div>
                        <div className="space-y-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                            <div className="flex items-start gap-2.5">
                                <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                                <span className="flex-1">Your Shopify store domain (e.g. `your-store.myshopify.com`)</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <ShieldCheck className="w-4 h-4 text-[var(--primary-blue)] mt-0.5 shrink-0" />
                                <span className="flex-1">Admin access to approve Shopify OAuth</span>
                            </div>
                        </div>
                    </div>

                    {!isAuthenticated ? (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <label className="block text-sm font-semibold text-[var(--text-primary)]">
                                        Store Domain
                                    </label>
                                    <Tooltip content="Find this in your Shopify admin URL (e.g., your-store.myshopify.com)" side="right">
                                        <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                    </Tooltip>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        value={shopDomain}
                                        onChange={(e) => {
                                            setShopDomain(e.target.value.toLowerCase());
                                            setDomainTouched(true);
                                        }}
                                        onBlur={() => setDomainTouched(true)}
                                        placeholder="your-store.myshopify.com"
                                        className={`pr-28 pl-4 py-2.5 sm:py-3 transition-all duration-200 ${validationStatus === 'valid' ? 'focus:ring-2 focus:ring-[var(--success)]/20' : validationStatus === 'invalid' ? 'focus:ring-2 focus:ring-[var(--error)]/20' : ''}`}
                                        autoFocus
                                        error={Boolean(domainError)}
                                        aria-invalid={Boolean(domainError)}
                                        aria-describedby="shopify-domain-hint shopify-domain-error"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        {validationStatus === 'validating' && (
                                            <Loader2 className="w-3.5 h-3.5 text-[var(--text-muted)] animate-spin" />
                                        )}
                                        {validationStatus === 'valid' && (
                                            <Check className="w-3.5 h-3.5 text-[var(--success)] animate-in fade-in duration-200" />
                                        )}
                                        {!shopDomain.includes('.myshopify.com') && shopDomain && (
                                            <span className="hidden xs:inline text-xs text-[var(--text-muted)] font-mono">
                                                .myshopify.com
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div
                                    id="shopify-domain-hint"
                                    className="mt-2 text-xs text-[var(--text-muted)] flex items-start sm:items-center gap-2 justify-between flex-wrap"
                                >
                                    <span className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                                        <Info className="w-3.5 h-3.5 shrink-0" />
                                        We will add `.myshopify.com` automatically if omitted.
                                    </span>
                                    <span className="hidden sm:inline-flex text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 whitespace-nowrap">
                                        Press ⌘V to paste
                                    </span>
                                </div>
                                {domainError && (
                                    <p
                                        id="shopify-domain-error"
                                        className="mt-2 text-xs text-[var(--error-text)] animate-in slide-in-from-top-1 duration-200"
                                    >
                                        {domainError}
                                    </p>
                                )}
                            </div>

                            <Alert className="bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/20">
                                <AlertDescription className="text-sm text-[var(--text-secondary)]">
                                    You'll be redirected to Shopify to securely authorize this connection
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <Alert className="bg-[var(--success-bg)] border-[var(--success)]/30">
                                <AlertDescription className="text-sm text-[var(--text-primary)] w-full">
                                    <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 w-full">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0" />
                                            <span className="break-all">
                                                Connected to <strong className="font-semibold">{storeName || shopDomain}</strong>
                                            </span>
                                        </div>
                                        <Badge variant="success" size="sm" className="shrink-0 bg-[var(--success)]/10 text-[var(--success)] border-0">
                                            Active
                                        </Badge>
                                    </div>
                                </AlertDescription>
                            </Alert>
                            {lastTestedAt && (
                                <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Last tested {lastTestedAt}
                                </div>
                            )}

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                    Sync Configuration
                                </h3>

                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <label className="block text-sm font-medium text-[var(--text-primary)]">
                                            Sync Frequency
                                        </label>
                                        <Tooltip content="Real-time uses webhooks for instant updates. Other options poll Shopify at intervals." side="right">
                                            <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
                                        </Tooltip>
                                    </div>
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
                                            Push tracking details back to Shopify
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
                                    className="flex items-center justify-between w-full p-2 py-3 -mx-2 hover:bg-[var(--bg-hover)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider group"
                                >
                                    Advanced Options
                                    {showAdvanced ? <ChevronUp className="w-4 h-4 group-hover:text-[var(--text-primary)]" /> : <ChevronDown className="w-4 h-4 group-hover:text-[var(--text-primary)]" />}
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
                                                    Email when stock is low
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

                            <div className="space-y-3 pt-2">
                                <Button
                                    variant={testResult ? 'outline' : 'primary'}
                                    onClick={handleTest}
                                    disabled={isTesting}
                                    className={`w-full h-11 sm:h-12 transition-all duration-200 font-medium ${testResult
                                        ? 'border-[#95BF47]/40 text-[#6E8F34] hover:bg-[#95BF47]/10'
                                        : 'bg-[#95BF47] hover:bg-[#829F3C] text-white'
                                        }`}
                                    size="md"
                                >
                                    {isTesting ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Testing Connection...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className={`w-4 h-4 ${testResult ? '' : 'text-white/90'}`} />
                                            <span>{testResult ? 'Test Again' : 'Test Connection'}</span>
                                        </div>
                                    )}
                                </Button>

                                {testAttempted && !testResult && (
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Testing checks your Shopify permissions and store access.
                                    </p>
                                )}

                                {testResult && (
                                    <Alert className={`transition-all duration-300 ${testResult.connected || testResult.success
                                        ? 'bg-[var(--success-bg)] border-[var(--success)]/30'
                                        : 'bg-[var(--error-bg)] border-[var(--error)]/30'
                                        }`}>
                                        {testResult.connected || testResult.success ? (
                                            <AlertDescription className="text-sm text-[var(--text-primary)] flex items-center gap-2">
                                                <Check className="w-5 h-5 text-[var(--success)] shrink-0" />
                                                Connection verified!
                                            </AlertDescription>
                                        ) : (
                                            <AlertDescription className="text-sm w-full">
                                                <div className="space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <AlertCircle className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5" />
                                                        <p className="text-[var(--error-text)] font-medium break-words flex-1">
                                                            {testResult.message || 'Connection failed'}
                                                        </p>
                                                    </div>
                                                    {testResult.error?.suggestion && (
                                                        <p className="text-xs text-[var(--text-secondary)] break-words ml-7">
                                                            {testResult.error.suggestion}
                                                        </p>
                                                    )}

                                                    {testResult.error?.retryable && (
                                                        <Button
                                                            onClick={handleTest}
                                                            disabled={isTesting}
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-3 text-xs h-9 w-full border-[var(--error)]/20 text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                                                        >
                                                            {isTesting ? 'Retrying...' : 'Retry Connection'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </AlertDescription>
                                        )}
                                    </Alert>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 sm:p-6 pb-6 sm:pb-6 safe-pb-4">
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                        {isAuthenticated ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => router.back()}
                                    className="flex-1 sm:flex-initial sm:min-w-[140px] h-11 sm:h-12"
                                    disabled={isCreating}
                                >
                                    Cancel
                                </Button>
                                {existingIntegration && storeId ? (
                                    <Button
                                        onClick={() => router.push(`/seller/integrations/shopify/${storeId}`)}
                                        className="flex-1 h-11 sm:h-12 bg-[#95BF47] hover:bg-[#829F3C] text-white font-medium"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Settings className="w-4 h-4" />
                                            <span>View Store Details</span>
                                        </div>
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isCreating || !testResult?.success}
                                        className="flex-1 h-11 sm:h-12 bg-[#95BF47] hover:bg-[#829F3C] text-white font-medium"
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
                                )}
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => router.back()}
                                    className="flex-1 sm:flex-initial sm:min-w-[140px] h-11 sm:h-12"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConnect}
                                    disabled={!shopDomain || Boolean(domainError) || isInitiating}
                                    className="flex-1 h-11 sm:h-12 bg-[#95BF47] hover:bg-[#829F3C] text-white font-medium"
                                >
                                    {isInitiating ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Connecting Store...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <ExternalLink className="w-4 h-4" />
                                            <span>Connect Store</span>
                                        </div>
                                    )}
                                </Button>
                            </>
                        )}
                    </div>
                    {isAuthenticated && !testResult?.success && (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Test your Shopify connection to enable setup.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
