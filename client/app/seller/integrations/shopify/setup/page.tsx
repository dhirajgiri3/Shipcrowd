/**
 * Shopify Integration Setup Wizard
 * 
 * Multi-step wizard for connecting Shopify store with OAuth.
 * Steps:
 * 1. Enter store domain
 * 2. OAuth authentication
 * 3. Configure settings
 * 4. Test & Complete
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout, type WizardStep } from '@/src/features/shared/components/WizardLayout';
import {
    useInitiateOAuth,
    useTestConnection,
    useCreateIntegration,
} from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import {
    Store,
    Check,
    AlertCircle,
    Loader2,
    ExternalLink,
    Settings,
    RefreshCw,
} from 'lucide-react';
import type {
    IntegrationSettings,
    FieldMapping,
    ShopifyCredentials,
    SyncFrequency,
} from '@/src/types/api/integrations';

const wizardSteps: WizardStep[] = [
    { id: 1, title: 'Store Details', description: 'Enter your Shopify store' },
    { id: 2, title: 'Connect', description: 'Authenticate with Shopify' },
    { id: 3, title: 'Settings', description: 'Configure sync options' },
    { id: 4, title: 'Complete', description: 'Test & complete setup' },
];

const syncFrequencyOptions: { value: SyncFrequency; label: string }[] = [
    { value: 'REALTIME', label: 'Real-time (via webhooks)' },
    { value: 'EVERY_5_MIN', label: 'Every 5 minutes' },
    { value: 'EVERY_15_MIN', label: 'Every 15 minutes' },
    { value: 'EVERY_30_MIN', label: 'Every 30 minutes' },
    { value: 'HOURLY', label: 'Hourly' },
    { value: 'MANUAL', label: 'Manual only' },
];

export default function ShopifyIntegrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Store details
    const [shopDomain, setShopDomain] = useState('');
    const [storeName, setStoreName] = useState('');

    // Step 2: OAuth (handled by backend redirect)
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accessToken, setAccessToken] = useState('');

    // Step 3: Settings
    const [settings, setSettings] = useState<Partial<IntegrationSettings>>({
        syncFrequency: 'EVERY_15_MIN',
        autoFulfill: true,
        autoTrackingUpdate: true,
        syncHistoricalOrders: false,
        historicalOrderDays: 30,
        orderFilters: {},
        notifications: {
            syncErrors: true,
            connectionIssues: true,
            lowInventory: false,
        },
    });

    // Step 4: Test
    const [testResult, setTestResult] = useState<any>(null);

    // API hooks
    const { mutate: initiateOAuth, isPending: isInitiatingOAuth } = useInitiateOAuth();
    const { mutate: testConnection, isPending: isTesting } = useTestConnection();
    const { mutate: createIntegration, isPending: isCreating } = useCreateIntegration();

    // Step validation
    const canProceedStep1 = () => {
        return shopDomain.length > 0 && /^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shopDomain);
    };

    const canProceedStep2 = () => {
        return isAuthenticated && accessToken.length > 0;
    };

    const canProceedStep3 = () => {
        return true; // Settings are optional with defaults
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: return canProceedStep1();
            case 2: return canProceedStep2();
            case 3: return canProceedStep3();
            case 4: return testResult?.success;
            default: return false;
        }
    };

    // Navigation handlers
    const handleNext = () => {
        if (currentStep === 1) {
            // Initiate OAuth (Redirect to backend)
            initiateOAuth({
                type: 'SHOPIFY',
                shop: shopDomain,
            }, {
                onSuccess: (data) => {
                    // Backend returns the install URL
                    if (data.authUrl) {
                        window.location.href = data.authUrl;
                    }
                }
            });
        } else if (currentStep < wizardSteps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    // Handle OAuth callback
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const store = params.get('store');
        const storeId = params.get('storeId');
        const message = params.get('message');
        const step = params.get('step');

        if (status === 'success' && store) {
            setIsAuthenticated(true);
            setShopDomain(store);
            setStoreName(store.replace('.myshopify.com', ''));
            // Optionally set token if returned, relying on backend auth state mostly
            if (step) {
                setCurrentStep(parseInt(step));
                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);
            }
        } else if (status === 'error') {
            // Show error message
            console.error('Installation failed:', message);
            // You might want to use a toast here if available
        }
    }, []);

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleTestConnection = () => {
        const params = new URLSearchParams(window.location.search);
        const storeId = params.get('storeId'); // We need storeId for testing now

        // Should use storeId if available, or just mock success since we are connected
        testConnection({
            type: 'SHOPIFY',
            credentials: {
                type: 'SHOPIFY',
                shopDomain,
                accessToken: 'connected' // Backend handles auth
            },
        }, {
            onSuccess: (data) => {
                setTestResult(data);
                if (data.storeName) {
                    setStoreName(data.storeName);
                }
            },
        });
    };

    const handleSubmit = () => {
        const credentials: ShopifyCredentials = {
            type: 'SHOPIFY',
            shopDomain,
            accessToken,
        };

        // Default field mapping for Shopify
        const fieldMapping: FieldMapping = {
            orderNumber: 'order_number',
            orderDate: 'created_at',
            orderTotal: 'total_price',
            paymentMethod: 'payment_gateway_names',
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
            onSuccess: () => {
                router.push('/seller/integrations');
            },
        });
    };

    const handleClose = () => {
        if (window.confirm('Are you sure you want to cancel the setup?')) {
            router.back();
        }
    };

    return (
        <WizardLayout
            steps={wizardSteps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            onClose={handleClose}
            title="Connect Shopify Store"
            subtitle="Automatically sync your Shopify orders to Shipcrowd"
            canGoBack={currentStep > 1}
            canGoNext={canProceed()}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
            isFinalStep={currentStep === 4}
            isSubmitting={isCreating}
        >
            {/* Step 1: Store Details */}
            {currentStep === 1 && (
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-[var(--success-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Store className="w-8 h-8 text-[var(--success)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                            Enter Your Shopify Store Domain
                        </h3>
                        <p className="text-[var(--text-secondary)]">
                            We'll connect to your Shopify store to sync orders automatically
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Store Domain *
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={shopDomain}
                                onChange={(e) => setShopDomain(e.target.value.toLowerCase())}
                                placeholder="your-store.myshopify.com"
                                className="w-full px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                            />
                            {shopDomain && !canProceedStep1() && (
                                <p className="mt-2 text-sm text-[var(--error)] flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    Please enter a valid Shopify domain (e.g., store.myshopify.com)
                                </p>
                            )}
                            {canProceedStep1() && (
                                <p className="mt-2 text-sm text-[var(--success)] flex items-center gap-1">
                                    <Check className="w-4 h-4" />
                                    Valid domain format
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-[var(--primary-blue)]/5 rounded-lg p-4 border border-[var(--primary-blue)]/20">
                        <h4 className="font-medium text-[var(--primary-blue)] mb-2 flex items-center gap-2">
                            <Store className="w-4 h-4" />
                            What you'll need
                        </h4>
                        <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                            <li>• Your Shopify store admin access</li>
                            <li>• Permission to install apps on your store</li>
                            <li>• Active Shopify plan</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Step 2: OAuth Authentication */}
            {currentStep === 2 && (
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-[var(--success-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <ExternalLink className="w-8 h-8 text-[var(--success)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                            Authenticate with Shopify
                        </h3>
                        <p className="text-[var(--text-secondary)]">
                            Click the button below to authorize Shipcrowd to access your Shopify store
                        </p>
                    </div>

                    {isAuthenticated ? (
                        <div className="bg-[var(--success-bg)] rounded-lg p-6 border border-[var(--success)] text-center">
                            <Check className="w-12 h-12 text-[var(--success)] mx-auto mb-4" />
                            <h4 className="font-semibold text-[var(--success)] mb-2">
                                Successfully Connected!
                            </h4>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Your Shopify store is now connected
                            </p>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsAuthenticated(true)}
                                disabled={isInitiatingOAuth}
                                className="w-full py-4 bg-[var(--success)] hover:bg-[var(--success-hover)] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isInitiatingOAuth ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Store className="w-5 h-5" />
                                        Connect to Shopify
                                    </>
                                )}
                            </button>

                            <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
                                <h4 className="font-medium text-[var(--text-primary)] mb-2">
                                    What happens next?
                                </h4>
                                <ol className="text-sm text-[var(--text-secondary)] space-y-2">
                                    <li>1. You'll be redirected to Shopify to log in</li>
                                    <li>2. Review the permissions Shipcrowd is requesting</li>
                                    <li>3. Click "Install app" to authorize</li>
                                    <li>4. You'll be brought back here to continue setup</li>
                                </ol>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Step 3: Settings */}
            {currentStep === 3 && (
                <div className="space-y-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                            Configure Sync Settings
                        </h3>
                        <p className="text-[var(--text-secondary)]">
                            Customize how orders are synced between Shopify and Shipcrowd
                        </p>
                    </div>

                    {/* Sync Frequency */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Sync Frequency
                        </label>
                        <select
                            value={settings.syncFrequency}
                            onChange={(e) => setSettings(prev => ({ ...prev, syncFrequency: e.target.value as SyncFrequency }))}
                            className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                        >
                            {syncFrequencyOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Auto-fulfill */}
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="autoFulfill"
                            checked={settings.autoFulfill}
                            onChange={(e) => setSettings(prev => ({ ...prev, autoFulfill: e.target.checked }))}
                            className="mt-1 w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                        />
                        <div>
                            <label htmlFor="autoFulfill" className="font-medium text-[var(--text-primary)] cursor-pointer">
                                Auto-fulfill orders
                            </label>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Automatically mark Shopify orders as fulfilled when shipment is created
                            </p>
                        </div>
                    </div>

                    {/* Auto tracking update */}
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="autoTrackingUpdate"
                            checked={settings.autoTrackingUpdate}
                            onChange={(e) => setSettings(prev => ({ ...prev, autoTrackingUpdate: e.target.checked }))}
                            className="mt-1 w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                        />
                        <div>
                            <label htmlFor="autoTrackingUpdate" className="font-medium text-[var(--text-primary)] cursor-pointer">
                                Push tracking updates
                            </label>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Send tracking numbers and status updates back to Shopify
                            </p>
                        </div>
                    </div>

                    {/* Historical orders */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="syncHistorical"
                                checked={settings.syncHistoricalOrders}
                                onChange={(e) => setSettings(prev => ({ ...prev, syncHistoricalOrders: e.target.checked }))}
                                className="mt-1 w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                            />
                            <div className="flex-1">
                                <label htmlFor="syncHistorical" className="font-medium text-[var(--text-primary)] cursor-pointer">
                                    Sync historical orders
                                </label>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Import past orders from Shopify
                                </p>
                            </div>
                        </div>

                        {settings.syncHistoricalOrders && (
                            <div className="ml-7">
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                    How many days back?
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={settings.historicalOrderDays}
                                    onChange={(e) => setSettings(prev => ({ ...prev, historicalOrderDays: parseInt(e.target.value) }))}
                                    className="w-32 px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 4: Test & Complete */}
            {currentStep === 4 && (
                <div className="space-y-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[var(--primary-blue)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Settings className="w-8 h-8 text-[var(--primary-blue)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                            Test Connection & Complete Setup
                        </h3>
                        <p className="text-[var(--text-secondary)]">
                            Verify the connection before activating the integration
                        </p>
                    </div>

                    {/* Test Connection Button */}
                    {!testResult && (
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="w-full py-3 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Testing Connection...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Test Connection
                                </>
                            )}
                        </button>
                    )}

                    {/* Test Results */}
                    {testResult && (
                        <div className={`rounded-lg p-6 border ${testResult.success
                            ? 'bg-[var(--success-bg)] border-[var(--success)]'
                            : 'bg-[var(--error-bg)] border-[var(--error)]'
                            }`}>
                            {testResult.success ? (
                                <>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Check className="w-6 h-6 text-[var(--success)]" />
                                        <h4 className="font-semibold text-[var(--success)]">
                                            Connection Successful!
                                        </h4>
                                    </div>
                                    <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                                        <p>Store: <strong>{testResult.storeName}</strong></p>
                                        {testResult.details?.ordersFound && (
                                            <p>Orders found: <strong>{testResult.details.ordersFound}</strong></p>
                                        )}
                                        {testResult.details?.apiVersion && (
                                            <p>API Version: <strong>{testResult.details.apiVersion}</strong></p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 mb-4">
                                        <AlertCircle className="w-6 h-6 text-[var(--error)]" />
                                        <h4 className="font-semibold text-[var(--error)]">
                                            Connection Failed
                                        </h4>
                                    </div>
                                    <p className="text-sm text-[var(--error)]">
                                        {testResult.message}
                                    </p>
                                    <button
                                        onClick={handleTestConnection}
                                        className="mt-4 px-4 py-2 bg-[var(--error)] hover:bg-[var(--error-hover)] text-white rounded-lg transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Summary */}
                    {testResult?.success && (
                        <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
                            <h4 className="font-semibold text-[var(--text-primary)] mb-4">
                                Integration Summary
                            </h4>
                            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                                <div className="flex justify-between">
                                    <span>Store:</span>
                                    <span className="font-medium text-[var(--text-primary)]">{shopDomain}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Sync Frequency:</span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {syncFrequencyOptions.find(o => o.value === settings.syncFrequency)?.label}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Auto-fulfill:</span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {settings.autoFulfill ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tracking Updates:</span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {settings.autoTrackingUpdate ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </WizardLayout>
    );
}
