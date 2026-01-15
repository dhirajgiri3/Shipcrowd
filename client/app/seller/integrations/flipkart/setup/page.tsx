/**
 * Flipkart Integration Setup Wizard
 * 
 * Multi-step wizard for connecting Flipkart Seller account.
 * Steps:
 * 1. Enter App credentials
 * 2. Access Token
 * 3. Configure settings
 * 4. Test & Complete
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout, type WizardStep } from '@/src/features/shared/components/WizardLayout';
import {
    useTestConnection,
    useCreateIntegration,
} from '@/src/core/api/hooks/useEcommerceIntegrations';
import {
    Store,
    Check,
    AlertCircle,
    Loader2,
    Key,
    Settings,
    RefreshCw,
} from 'lucide-react';
import type {
    IntegrationSettings,
    FieldMapping,
    FlipkartCredentials,
    SyncFrequency,
} from '@/src/types/api/integrations.types';

const wizardSteps: WizardStep[] = [
    { id: 1, title: 'App Credentials', description: 'Enter App ID & Secret' },
    { id: 2, title: 'Access Token', description: 'Add access token' },
    { id: 3, title: 'Settings', description: 'Configure sync' },
    { id: 4, title: 'Complete', description: 'Test & finish' },
];

export default function FlipkartIntegrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    const [appId, setAppId] = useState('');
    const [appSecret, setAppSecret] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [storeName, setStoreName] = useState('');

    const [settings, setSettings] = useState<Partial<IntegrationSettings>>({
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
    });

    const [testResult, setTestResult] = useState<any>(null);

    const { mutate: testConnection, isPending: isTesting } = useTestConnection();
    const { mutate: createIntegration, isPending: isCreating } = useCreateIntegration();

    const canProceed = () => {
        switch (currentStep) {
            case 1: return appId.length > 0 && appSecret.length > 0;
            case 2: return accessToken.length > 0;
            case 3: return true;
            case 4: return testResult?.success;
            default: return false;
        }
    };

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
            },
        });
    };

    const handleSubmit = () => {
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
            customerEmail: 'email',
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
            productPrice: 'orderItems[].unitPrice',
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
                router.push('/seller/integrations');
            },
        });
    };

    return (
        <WizardLayout
            steps={wizardSteps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            onClose={() => router.back()}
            title="Connect Flipkart Seller"
            subtitle="Sync your Flipkart orders automatically"
            canGoBack={currentStep > 1}
            canGoNext={canProceed()}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
            isFinalStep={currentStep === 4}
            isSubmitting={isCreating}
        >
            {currentStep === 1 && (
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Store className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Enter Flipkart App Credentials
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            App ID *
                        </label>
                        <input
                            type="text"
                            value={appId}
                            onChange={(e) => setAppId(e.target.value)}
                            placeholder="Your Flipkart App ID"
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            App Secret *
                        </label>
                        <input
                            type="password"
                            value={appSecret}
                            onChange={(e) => setAppSecret(e.target.value)}
                            placeholder="Your Flipkart App Secret"
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Get API Credentials
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Contact Flipkart Seller Support to request API access and credentials
                        </p>
                    </div>
                </div>
            )}

            {currentStep === 2 && (
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Key className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Enter Access Token
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Access Token *
                        </label>
                        <textarea
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                            placeholder="Paste your Flipkart access token here"
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            How to get Access Token:
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Use the App ID and Secret to generate an access token via Flipkart's OAuth flow or contact their support for assistance.
                        </p>
                    </div>
                </div>
            )}

            {currentStep === 3 && (
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Configure Settings
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Sync Frequency
                        </label>
                        <select
                            value={settings.syncFrequency}
                            onChange={(e) => setSettings(prev => ({ ...prev, syncFrequency: e.target.value as SyncFrequency }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="HOURLY">Hourly</option>
                            <option value="EVERY_30_MIN">Every 30 minutes</option>
                            <option value="MANUAL">Manual only</option>
                        </select>
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
                                Send tracking info back to Flipkart
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="lowInventoryNotif"
                            checked={settings.notifications?.lowInventory}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                notifications: { ...prev.notifications!, lowInventory: e.target.checked }
                            }))}
                            className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                            <label htmlFor="lowInventoryNotif" className="font-medium text-gray-900 dark:text-white cursor-pointer">
                                Low inventory alerts
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Get notified when product inventory is low
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 4 && (
                <div className="space-y-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Test Connection
                        </h3>
                    </div>

                    {!testResult && (
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                    )}

                    {testResult && (
                        <div className={`rounded-lg p-6 border ${testResult.success
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200'
                            }`}>
                            {testResult.success ? (
                                <>
                                    <Check className="w-6 h-6 text-green-600 mb-2" />
                                    <h4 className="font-semibold text-green-900 mb-2">Connection Successful!</h4>
                                    <p className="text-sm text-green-700">
                                        Store: <strong>{testResult.storeName || 'Flipkart Store'}</strong>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
                                    <h4 className="font-semibold text-red-900 mb-2">Connection Failed</h4>
                                    <p className="text-sm text-red-700">{testResult.message}</p>
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
