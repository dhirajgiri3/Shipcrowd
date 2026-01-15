/**
 * WooCommerce Integration Setup Wizard
 * 
 * Multi-step wizard for connecting WooCommerce store.
 * Steps:
 * 1. Enter store details
 * 2. API credentials (Consumer Key/Secret)
 * 3. Configure settings
 * 4. Test & Complete
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout, type WizardStep } from '@/src/features/shared/components/WizardLayout';
import {
    useTestConnection,
    useCreateIntegration,
} from '@/src/core/api/hooks/useEcommerceIntegrations';
import {
    ShoppingCart,
    Check,
    AlertCircle,
    Loader2,
    Key,
    Settings,
    RefreshCw,
    ExternalLink,
} from 'lucide-react';
import type {
    IntegrationSettings,
    FieldMapping,
    WooCommerceCredentials,
    SyncFrequency,
} from '@/src/types/api/integrations.types';

const wizardSteps: WizardStep[] = [
    { id: 1, title: 'Store Details', description: 'Enter your WooCommerce store URL' },
    { id: 2, title: 'API Keys', description: 'Add Consumer Key & Secret' },
    { id: 3, title: 'Settings', description: 'Configure sync options' },
    { id: 4, title: 'Complete', description: 'Test & complete setup' },
];

const syncFrequencyOptions: { value: SyncFrequency; label: string }[] = [
    { value: 'REALTIME', label: 'Real-time (via webhooks)' },
    { value: 'EVERY_15_MIN', label: 'Every 15 minutes' },
    { value: 'EVERY_30_MIN', label: 'Every 30 minutes' },
    { value: 'HOURLY', label: 'Hourly' },
    { value: 'MANUAL', label: 'Manual only' },
];

export default function WooCommerceIntegrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Store details
    const [siteUrl, setSiteUrl] = useState('');
    const [storeName, setStoreName] = useState('');

    // Step 2: API credentials
    const [consumerKey, setConsumerKey] = useState('');
    const [consumerSecret, setConsumerSecret] = useState('');

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
    const { mutate: testConnection, isPending: isTesting } = useTestConnection();
    const { mutate: createIntegration, isPending: isCreating } = useCreateIntegration();

    // Step validation
    const canProceedStep1 = () => {
        return siteUrl.length > 0 && /^https?:\/\/.+/.test(siteUrl);
    };

    const canProceedStep2 = () => {
        return consumerKey.length > 0 && consumerSecret.length > 0;
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: return canProceedStep1();
            case 2: return canProceedStep2();
            case 3: return true;
            case 4: return testResult?.success;
            default: return false;
        }
    };

    // Navigation
    const handleNext = () => {
        if (currentStep < wizardSteps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleTestConnection = () => {
        const credentials: WooCommerceCredentials = {
            type: 'WOOCOMMERCE',
            siteUrl,
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
            },
        });
    };

    const handleSubmit = () => {
        const credentials: WooCommerceCredentials = {
            type: 'WOOCOMMERCE',
            siteUrl,
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
            name: storeName || new URL(siteUrl).hostname,
            storeName: storeName || new URL(siteUrl).hostname,
            storeUrl: siteUrl,
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
        if (window.confirm('Cancel WooCommerce setup?')) {
            router.back();
        }
    };

    return (
        <WizardLayout
            steps={wizardSteps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            onClose={handleClose}
            title="Connect WooCommerce Store"
            subtitle="Sync your WooCommerce orders automatically"
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
                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <ShoppingCart className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Enter Your WooCommerce Store URL
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            We'll connect to your WooCommerce REST API
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Store URL *
                        </label>
                        <input
                            type="url"
                            value={siteUrl}
                            onChange={(e) => setSiteUrl(e.target.value)}
                            placeholder="https://your-store.com"
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {siteUrl && !canProceedStep1() && (
                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                Please enter a valid URL
                            </p>
                        )}
                        {canProceedStep1() && (
                            <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Valid URL format
                            </p>
                        )}
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                        <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Before you continue
                        </h4>
                        <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                            <li>• Ensure WooCommerce REST API is enabled</li>
                            <li>• You'll need to generate API keys (next step)</li>
                            <li>• WordPress admin access required</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Step 2: API Credentials */}
            {currentStep === 2 && (
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Key className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Enter API Credentials
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Add your WooCommerce REST API keys
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Consumer Key *
                        </label>
                        <input
                            type="text"
                            value={consumerKey}
                            onChange={(e) => setConsumerKey(e.target.value)}
                            placeholder="ck_..."
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Consumer Secret *
                        </label>
                        <input
                            type="password"
                            value={consumerSecret}
                            onChange={(e) => setConsumerSecret(e.target.value)}
                            placeholder="cs_..."
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            How to get API keys:
                        </h4>
                        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <li>1. Go to WooCommerce → Settings → Advanced → REST API</li>
                            <li>2. Click "Add key"</li>
                            <li>3. Set permissions to "Read/Write"</li>
                            <li>4. Copy the Consumer Key and Consumer Secret</li>
                        </ol>
                        <a
                            href="https://woocommerce.github.io/woocommerce-rest-api-docs/#rest-api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                            View documentation
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            )}

            {/* Step 3: Settings */}
            {currentStep === 3 && (
                <div className="space-y-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            Configure Sync Settings
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Customize how orders are synced
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Sync Frequency
                        </label>
                        <select
                            value={settings.syncFrequency}
                            onChange={(e) => setSettings(prev => ({ ...prev, syncFrequency: e.target.value as SyncFrequency }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {syncFrequencyOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="autoFulfill"
                            checked={settings.autoFulfill}
                            onChange={(e) => setSettings(prev => ({ ...prev, autoFulfill: e.target.checked }))}
                            className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                            <label htmlFor="autoFulfill" className="font-medium text-gray-900 dark:text-white cursor-pointer">
                                Auto-fulfill orders
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Mark WooCommerce orders as completed when shipment is created
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="autoTrackingUpdate"
                            checked={settings.autoTrackingUpdate}
                            onChange={(e) => setSettings(prev => ({ ...prev, autoTrackingUpdate: e.target.checked }))}
                            className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                            <label htmlFor="autoTrackingUpdate" className="font-medium text-gray-900 dark:text-white cursor-pointer">
                                Push tracking updates
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Send tracking info back to WooCommerce via order notes
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="syncHistorical"
                                checked={settings.syncHistoricalOrders}
                                onChange={(e) => setSettings(prev => ({ ...prev, syncHistoricalOrders: e.target.checked }))}
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div className="flex-1">
                                <label htmlFor="syncHistorical" className="font-medium text-gray-900 dark:text-white cursor-pointer">
                                    Sync historical orders
                                </label>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Import past orders
                                </p>
                            </div>
                        </div>

                        {settings.syncHistoricalOrders && (
                            <div className="ml-7">
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                    Days back
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={settings.historicalOrderDays}
                                    onChange={(e) => setSettings(prev => ({ ...prev, historicalOrderDays: parseInt(e.target.value) }))}
                                    className="w-32 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Settings className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Test Connection & Complete
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Verify the connection before activation
                        </p>
                    </div>

                    {!testResult && (
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Test Connection
                                </>
                            )}
                        </button>
                    )}

                    {testResult && (
                        <div className={`rounded-lg p-6 border ${testResult.success
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            }`}>
                            {testResult.success ? (
                                <>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        <h4 className="font-semibold text-green-900 dark:text-green-100">
                                            Connection Successful!
                                        </h4>
                                    </div>
                                    <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                                        <p>Store: <strong>{testResult.storeName || siteUrl}</strong></p>
                                        {testResult.details?.ordersFound && (
                                            <p>Orders found: <strong>{testResult.details.ordersFound}</strong></p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 mb-4">
                                        <AlertCircle className="w-6 h-6 text-red-600" />
                                        <h4 className="font-semibold text-red-900 dark:text-red-100">
                                            Connection Failed
                                        </h4>
                                    </div>
                                    <p className="text-sm text-red-700">
                                        {testResult.message}
                                    </p>
                                    <button
                                        onClick={handleTestConnection}
                                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                    >
                                        Try Again
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </WizardLayout>
    );
}
