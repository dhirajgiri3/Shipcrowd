/**
 * Amazon Integration Setup Wizard
 * 
 * Multi-step wizard for connecting Amazon Seller Central.
 * Steps:
 * 1. Enter Seller ID
 * 2. MWS Auth Token
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
} from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import {
    Store,
    Check,
    AlertCircle,
    Loader2,
    Key,
    Settings,
    RefreshCw,
    Globe,
} from 'lucide-react';
import type {
    IntegrationSettings,
    FieldMapping,
    AmazonCredentials,
    SyncFrequency,
} from '@/src/types/api/integrations';

const wizardSteps: WizardStep[] = [
    { id: 1, title: 'Seller ID', description: 'Enter your Amazon Seller ID' },
    { id: 2, title: 'Auth Token', description: 'Add MWS Auth Token' },
    { id: 3, title: 'Settings', description: 'Configure sync options' },
    { id: 4, title: 'Complete', description: 'Test & complete' },
];

const regionOptions = [
    { value: 'IN', label: 'India (IN)' },
    { value: 'US', label: 'United States (US)' },
    { value: 'EU', label: 'Europe (EU)' },
    { value: 'JP', label: 'Japan (JP)' },
];

export default function AmazonIntegrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    const [sellerId, setSellerId] = useState('');
    const [mwsAuthToken, setMwsAuthToken] = useState('');
    const [region, setRegion] = useState<'IN' | 'US' | 'EU' | 'JP'>('IN');
    const [storeName, setStoreName] = useState('');

    const [settings, setSettings] = useState<Partial<IntegrationSettings>>({
        syncFrequency: 'HOURLY',
        autoFulfill: false, // Amazon handles fulfillment
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
            case 1: return sellerId.length > 0;
            case 2: return mwsAuthToken.length > 0;
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
            },
        });
    };

    const handleSubmit = () => {
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

        createIntegration({
            type: 'AMAZON',
            name: storeName || `Amazon ${region}`,
            storeName: storeName || `Amazon ${region}`,
            storeUrl: `https://sellercentral.amazon.${region.toLowerCase()}`,
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
            title="Connect Amazon Seller"
            subtitle="Sync your Amazon orders automatically"
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
                        <div className="w-16 h-16 bg-[var(--warning-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Store className="w-8 h-8 text-[var(--warning)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                            Enter Amazon Seller Details
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Seller ID *
                        </label>
                        <input
                            type="text"
                            value={sellerId}
                            onChange={(e) => setSellerId(e.target.value)}
                            placeholder="A1XXXXXXXXX"
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Region *
                        </label>
                        <select
                            value={region}
                            onChange={(e) => setRegion(e.target.value as any)}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                        >
                            {regionOptions.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-[var(--warning-bg)] rounded-lg p-4 border border-[var(--warning-border)]">
                        <h4 className="font-medium text-[var(--warning-text)] mb-2">
                            Find your Seller ID
                        </h4>
                        <p className="text-sm text-[var(--warning-text)] opacity-90">
                            Go to Settings → Account Info in Seller Central
                        </p>
                    </div>
                </div>
            )}

            {currentStep === 2 && (
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-[var(--warning-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Key className="w-8 h-8 text-[var(--warning)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                            Enter MWS Auth Token
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            MWS Auth Token *
                        </label>
                        <input
                            type="password"
                            value={mwsAuthToken}
                            onChange={(e) => setMwsAuthToken(e.target.value)}
                            placeholder="amzn.mws.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                        />
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
                        <h4 className="font-medium text-[var(--text-primary)] mb-2">
                            How to get MWS Auth Token:
                        </h4>
                        <ol className="text-sm text-[var(--text-secondary)] space-y-2">
                            <li>1. Go to Settings → User Permissions in Seller Central</li>
                            <li>2. Visit Apps & Services</li>
                            <li>3. Authorize Shipcrowd to access your account</li>
                            <li>4. Copy the MWS Auth Token provided</li>
                        </ol>
                    </div>
                </div>
            )}

            {currentStep === 3 && (
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        Configure Settings
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Sync Frequency
                        </label>
                        <select
                            value={settings.syncFrequency}
                            onChange={(e) => setSettings(prev => ({ ...prev, syncFrequency: e.target.value as SyncFrequency }))}
                            className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
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
                            className="mt-1 w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                        />
                        <div>
                            <label htmlFor="autoTrackingUpdate" className="font-medium text-[var(--text-primary)] cursor-pointer">
                                Push tracking updates
                            </label>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Send tracking info back to Amazon
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 4 && (
                <div className="space-y-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[var(--warning-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Settings className="w-8 h-8 text-[var(--warning)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                            Test Connection
                        </h3>
                    </div>

                    {!testResult && (
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="w-full py-3 bg-[var(--warning)] hover:opacity-90 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                    )}

                    {testResult && (
                        <div className={`rounded-lg p-6 border ${testResult.success
                            ? 'bg-[var(--success-bg)] border-[var(--success-border)]'
                            : 'bg-[var(--error-bg)] border-[var(--error-border)]'
                            }`}>
                            {testResult.success ? (
                                <>
                                    <Check className="w-6 h-6 text-[var(--success)] mb-2" />
                                    <h4 className="font-semibold text-[var(--success-text)] mb-2">Connection Successful!</h4>
                                    <p className="text-sm text-[var(--success-text)]">
                                        Store: <strong>{testResult.storeName || `Amazon ${region}`}</strong>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-6 h-6 text-[var(--error)] mb-2" />
                                    <h4 className="font-semibold text-[var(--error-text)] mb-2">Connection Failed</h4>
                                    <p className="text-sm text-[var(--error-text)]">{testResult.message}</p>
                                    <button
                                        onClick={handleTestConnection}
                                        className="mt-4 px-4 py-2 bg-[var(--error)] hover:opacity-90 text-white rounded-lg"
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
