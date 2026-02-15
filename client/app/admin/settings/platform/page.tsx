'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/src/components/ui/core/Card';
import { Input } from '@/src/components/ui/core/Input';
import { Label } from '@/src/components/ui/core/Label';
import { Badge } from '@/src/components/ui/core/Badge';
import { Checkbox } from '@/src/components/ui/core/Checkbox';
import { Select } from '@/src/components/ui/form/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/core/Tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/src/components/ui/feedback/Dialog';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import {
    usePlatformSettings,
    useUpdatePlatformSettings,
    useTestIntegration,
} from '@/src/core/api/hooks/settings/useSettings';
import type { UpdatePlatformSettingsRequest } from '@/src/types/api/settings';
import {
    Save,
    Building,
    DollarSign,
    Plug,
    Bell,
    TestTube,
    Eye,
    EyeOff,
    CheckCircle2,
} from 'lucide-react';

export default function PlatformSettingsPage() {
    const { data: settings, isLoading } = usePlatformSettings();
    const updateSettings = useUpdatePlatformSettings();
    const testIntegration = useTestIntegration();

    const [formData, setFormData] = useState<UpdatePlatformSettingsRequest>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

    // Initialize form when settings load
    useEffect(() => {
        if (settings && !hasChanges) {
            setFormData({
                business: { ...settings.business },
                financial: { ...settings.financial },
                integrations: {
                    email: { ...settings.integrations.email },
                    sms: { ...settings.integrations.sms },
                    storage: { ...settings.integrations.storage },
                    payment: { ...settings.integrations.payment },
                },
                notifications: { ...settings.notifications },
            });
        }
    }, [settings]);

    const handleChange = (
        section: keyof UpdatePlatformSettingsRequest,
        field: string,
        value: any
    ) => {
        setFormData((prev) => ({
            ...prev,
            [section]: {
                ...((prev[section] as any) || {}),
                [field]: value,
            },
        }));
        setHasChanges(true);
    };

    const handleIntegrationChange = (
        integrationType: 'email' | 'sms' | 'storage' | 'payment',
        field: string,
        value: any
    ) => {
        setFormData((prev) => ({
            ...prev,
            integrations: {
                ...prev.integrations,
                [integrationType]: {
                    ...((prev.integrations?.[integrationType] as any) || {}),
                    [field]: value,
                },
            },
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            await updateSettings.mutateAsync(formData);
            setHasChanges(false);
            setShowConfirmDialog(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleTest = async (type: 'email' | 'sms' | 'storage' | 'payment') => {
        try {
            await testIntegration.mutateAsync({ type });
        } catch (error) {
            // Error handled by mutation
        }
    };

    const toggleApiKeyVisibility = (key: string) => {
        setShowApiKeys((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const maskApiKey = (key?: string) => {
        if (!key) return '••••••••••••';
        return showApiKeys[key] ? key : '••••••••••••';
    };

    if (isLoading || !settings) {
        return (
            <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
                <PageHeader
                    title="Platform Settings"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/admin' },
                        { label: 'Settings', href: '/admin/settings' },
                        { label: 'Platform', active: true },
                    ]}
                    subtitle="Configure platform-wide settings and integrations"
                    showBack={false}
                />
                <div className="space-y-4 max-w-4xl">
                    <Skeleton className="h-12 w-40 rounded-lg" />
                    <Skeleton className="h-96 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
            <PageHeader
                title="Platform Settings"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin' },
                    { label: 'Settings', href: '/admin/settings' },
                    { label: 'Platform', active: true },
                ]}
                subtitle="Configure platform-wide settings and integrations"
                showBack={false}
                actions={
                    <Button onClick={() => setShowConfirmDialog(true)} disabled={!hasChanges}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                }
            />

            {/* Settings Tabs */}
            <Tabs defaultValue="business">
                <TabsList>
                    <TabsTrigger value="business">
                        <Building className="h-4 w-4 mr-2" />
                        Business
                    </TabsTrigger>
                    <TabsTrigger value="financial">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Financial
                    </TabsTrigger>
                    <TabsTrigger value="integrations">
                        <Plug className="h-4 w-4 mr-2" />
                        Integrations
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                    </TabsTrigger>
                </TabsList>

                {/* Business Settings */}
                <TabsContent value="business" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Business Information</CardTitle>
                            <CardDescription>
                                Basic information about your business
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="businessName">Business Name</Label>
                                    <Input
                                        id="businessName"
                                        value={formData.business?.name || settings.business.name}
                                        onChange={(e) =>
                                            handleChange('business', 'name', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="businessEmail">Email</Label>
                                    <Input
                                        id="businessEmail"
                                        type="email"
                                        value={formData.business?.email || settings.business.email}
                                        onChange={(e) =>
                                            handleChange('business', 'email', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="businessPhone">Phone</Label>
                                    <Input
                                        id="businessPhone"
                                        value={formData.business?.phone || settings.business.phone}
                                        onChange={(e) =>
                                            handleChange('business', 'phone', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="businessWebsite">Website (Optional)</Label>
                                    <Input
                                        id="businessWebsite"
                                        value={
                                            formData.business?.website || settings.business.website || ''
                                        }
                                        onChange={(e) =>
                                            handleChange('business', 'website', e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="businessAddress">Address</Label>
                                <Input
                                    id="businessAddress"
                                    value={formData.business?.address || settings.business.address}
                                    onChange={(e) =>
                                        handleChange('business', 'address', e.target.value)
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Financial Settings */}
                <TabsContent value="financial" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial Configuration</CardTitle>
                            <CardDescription>Currency, tax, and COD settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Select
                                        id="currency"
                                        options={[
                                            { label: 'INR (₹)', value: 'INR' },
                                            { label: 'USD ($)', value: 'USD' },
                                            { label: 'EUR (€)', value: 'EUR' },
                                        ]}
                                        value={
                                            formData.financial?.currency ||
                                            settings.financial.currency
                                        }
                                        onChange={(e) =>
                                            handleChange('financial', 'currency', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="minWalletBalance">
                                        Minimum Wallet Balance (₹)
                                    </Label>
                                    <Input
                                        id="minWalletBalance"
                                        type="number"
                                        value={
                                            formData.financial?.minWalletBalance ||
                                            settings.financial.minWalletBalance
                                        }
                                        onChange={(e) =>
                                            handleChange(
                                                'financial',
                                                'minWalletBalance',
                                                parseFloat(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="border-t border-[var(--border-subtle)] pt-4 space-y-4">
                                <h4 className="font-medium text-[var(--text-primary)]">GST Configuration</h4>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="gstEnabled"
                                        checked={
                                            formData.financial?.gstEnabled ??
                                            settings.financial.gstEnabled
                                        }
                                        onCheckedChange={(checked) =>
                                            handleChange('financial', 'gstEnabled', checked === true)
                                        }
                                    />
                                    <Label htmlFor="gstEnabled" className="text-[var(--text-primary)]">Enable GST</Label>
                                </div>
                                {(formData.financial?.gstEnabled ??
                                    settings.financial.gstEnabled) && (
                                        <div className="space-y-2">
                                            <Label htmlFor="gstPercentage">GST Percentage (%)</Label>
                                            <Input
                                                id="gstPercentage"
                                                type="number"
                                                step="0.01"
                                                value={
                                                    formData.financial?.gstPercentage ||
                                                    settings.financial.gstPercentage
                                                }
                                                onChange={(e) =>
                                                    handleChange(
                                                        'financial',
                                                        'gstPercentage',
                                                        parseFloat(e.target.value)
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                            </div>

                            <div className="border-t border-[var(--border-subtle)] pt-4 space-y-4">
                                <h4 className="font-medium text-[var(--text-primary)]">COD Charges</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="codChargePercentage">Percentage (%)</Label>
                                        <Input
                                            id="codChargePercentage"
                                            type="number"
                                            step="0.01"
                                            value={
                                                formData.financial?.codChargePercentage ||
                                                settings.financial.codChargePercentage
                                            }
                                            onChange={(e) =>
                                                handleChange(
                                                    'financial',
                                                    'codChargePercentage',
                                                    parseFloat(e.target.value)
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="codChargeMin">Minimum (₹)</Label>
                                        <Input
                                            id="codChargeMin"
                                            type="number"
                                            value={
                                                formData.financial?.codChargeMin ||
                                                settings.financial.codChargeMin
                                            }
                                            onChange={(e) =>
                                                handleChange(
                                                    'financial',
                                                    'codChargeMin',
                                                    parseFloat(e.target.value)
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="codChargeMax">Maximum (₹)</Label>
                                        <Input
                                            id="codChargeMax"
                                            type="number"
                                            value={
                                                formData.financial?.codChargeMax ||
                                                settings.financial.codChargeMax
                                            }
                                            onChange={(e) =>
                                                handleChange(
                                                    'financial',
                                                    'codChargeMax',
                                                    parseFloat(e.target.value)
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Integrations */}
                <TabsContent value="integrations" className="space-y-4">
                    {/* Email Service */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Email Service</CardTitle>
                                    <CardDescription>Configure email provider</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={
                                            settings.integrations.email.isEnabled
                                                ? 'success'
                                                : 'outline'
                                        }
                                    >
                                        {settings.integrations.email.isEnabled
                                            ? 'Enabled'
                                            : 'Disabled'}
                                    </Badge>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTest('email')}
                                    >
                                        <TestTube className="h-4 w-4 mr-2" />
                                        Test
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emailProvider">Provider</Label>
                                    <Select
                                        id="emailProvider"
                                        options={[
                                            { label: 'SMTP', value: 'SMTP' },
                                            { label: 'SendGrid', value: 'SENDGRID' },
                                            { label: 'AWS SES', value: 'AWS_SES' },
                                            { label: 'Mailgun', value: 'MAILGUN' },
                                        ]}
                                        value={
                                            formData.integrations?.email?.provider ||
                                            settings.integrations.email.provider
                                        }
                                        onChange={(e) =>
                                            handleIntegrationChange('email', 'provider', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emailFromEmail">From Email</Label>
                                    <Input
                                        id="emailFromEmail"
                                        type="email"
                                        value={
                                            formData.integrations?.email?.fromEmail ||
                                            settings.integrations.email.fromEmail
                                        }
                                        onChange={(e) =>
                                            handleIntegrationChange('email', 'fromEmail', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emailFromName">From Name</Label>
                                    <Input
                                        id="emailFromName"
                                        value={
                                            formData.integrations?.email?.fromName ||
                                            settings.integrations.email.fromName
                                        }
                                        onChange={(e) =>
                                            handleIntegrationChange('email', 'fromName', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emailApiKey">API Key</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="emailApiKey"
                                            type={showApiKeys['email'] ? 'text' : 'password'}
                                            value={
                                                formData.integrations?.email?.apiKey ||
                                                maskApiKey(settings.integrations.email.apiKey)
                                            }
                                            onChange={(e) =>
                                                handleIntegrationChange('email', 'apiKey', e.target.value)
                                            }
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => toggleApiKeyVisibility('email')}
                                        >
                                            {showApiKeys['email'] ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="emailEnabled"
                                    checked={
                                        formData.integrations?.email?.isEnabled ??
                                        settings.integrations.email.isEnabled
                                    }
                                    onCheckedChange={(checked) =>
                                        handleIntegrationChange('email', 'isEnabled', checked === true)
                                    }
                                />
                                <Label htmlFor="emailEnabled" className="text-[var(--text-primary)]">Enable Email Service</Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SMS Service */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>SMS Service</CardTitle>
                                    <CardDescription>Configure SMS provider</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={
                                            settings.integrations.sms.isEnabled
                                                ? 'success'
                                                : 'outline'
                                        }
                                    >
                                        {settings.integrations.sms.isEnabled
                                            ? 'Enabled'
                                            : 'Disabled'}
                                    </Badge>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTest('sms')}
                                    >
                                        <TestTube className="h-4 w-4 mr-2" />
                                        Test
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="smsProvider">Provider</Label>
                                    <Select
                                        id="smsProvider"
                                        options={[
                                            { label: 'Twilio', value: 'TWILIO' },
                                            { label: 'AWS SNS', value: 'AWS_SNS' },
                                            { label: 'MSG91', value: 'MSG91' },
                                            { label: 'Gupshup', value: 'GUPSHUP' },
                                        ]}
                                        value={
                                            formData.integrations?.sms?.provider ||
                                            settings.integrations.sms.provider
                                        }
                                        onChange={(e) =>
                                            handleIntegrationChange('sms', 'provider', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smsSenderId">Sender ID</Label>
                                    <Input
                                        id="smsSenderId"
                                        value={
                                            formData.integrations?.sms?.senderId ||
                                            settings.integrations.sms.senderId
                                        }
                                        onChange={(e) =>
                                            handleIntegrationChange('sms', 'senderId', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smsApiKey">API Key</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="smsApiKey"
                                            type={showApiKeys['sms'] ? 'text' : 'password'}
                                            value={
                                                formData.integrations?.sms?.apiKey ||
                                                maskApiKey(settings.integrations.sms.apiKey)
                                            }
                                            onChange={(e) =>
                                                handleIntegrationChange('sms', 'apiKey', e.target.value)
                                            }
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => toggleApiKeyVisibility('sms')}
                                        >
                                            {showApiKeys['sms'] ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="smsEnabled"
                                    checked={
                                        formData.integrations?.sms?.isEnabled ??
                                        settings.integrations.sms.isEnabled
                                    }
                                    onCheckedChange={(checked) =>
                                        handleIntegrationChange('sms', 'isEnabled', checked === true)
                                    }
                                />
                                <Label htmlFor="smsEnabled" className="text-[var(--text-primary)]">Enable SMS Service</Label>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>
                                Configure when to send notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="emailNotifications"
                                        checked={
                                            formData.notifications?.emailEnabled ??
                                            settings.notifications.emailEnabled
                                        }
                                        onCheckedChange={(checked) =>
                                            handleChange('notifications', 'emailEnabled', checked === true)
                                        }
                                    />
                                    <Label htmlFor="emailNotifications" className="text-[var(--text-primary)]">
                                        Enable Email Notifications
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="smsNotifications"
                                        checked={
                                            formData.notifications?.smsEnabled ??
                                            settings.notifications.smsEnabled
                                        }
                                        onCheckedChange={(checked) =>
                                            handleChange('notifications', 'smsEnabled', checked === true)
                                        }
                                    />
                                    <Label htmlFor="smsNotifications" className="text-[var(--text-primary)]">Enable SMS Notifications</Label>
                                </div>
                            </div>

                            <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
                                <h4 className="font-medium text-[var(--text-primary)]">Event Notifications</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="notifyOrderCreated"
                                            checked={
                                                formData.notifications?.notifyOnOrderCreated ??
                                                settings.notifications.notifyOnOrderCreated
                                            }
                                            onCheckedChange={(checked) =>
                                                handleChange(
                                                    'notifications',
                                                    'notifyOnOrderCreated',
                                                    checked === true
                                                )
                                            }
                                        />
                                        <Label htmlFor="notifyOrderCreated" className="text-[var(--text-primary)]">Order Created</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="notifyShipmentStatus"
                                            checked={
                                                formData.notifications?.notifyOnShipmentStatusChange ??
                                                settings.notifications.notifyOnShipmentStatusChange
                                            }
                                            onCheckedChange={(checked) =>
                                                handleChange(
                                                    'notifications',
                                                    'notifyOnShipmentStatusChange',
                                                    checked === true
                                                )
                                            }
                                        />
                                        <Label htmlFor="notifyShipmentStatus" className="text-[var(--text-primary)]">
                                            Shipment Status Change
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="notifyPayment"
                                            checked={
                                                formData.notifications?.notifyOnPaymentReceived ??
                                                settings.notifications.notifyOnPaymentReceived
                                            }
                                            onCheckedChange={(checked) =>
                                                handleChange(
                                                    'notifications',
                                                    'notifyOnPaymentReceived',
                                                    checked === true
                                                )
                                            }
                                        />
                                        <Label htmlFor="notifyPayment" className="text-[var(--text-primary)]">Payment Received</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="notifyKYC"
                                            checked={
                                                formData.notifications?.notifyOnKYCStatusChange ??
                                                settings.notifications.notifyOnKYCStatusChange
                                            }
                                            onCheckedChange={(checked) =>
                                                handleChange(
                                                    'notifications',
                                                    'notifyOnKYCStatusChange',
                                                    checked === true
                                                )
                                            }
                                        />
                                        <Label htmlFor="notifyKYC" className="text-[var(--text-primary)]">KYC Status Change</Label>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Settings Update</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to save these platform settings? This will affect
                            the entire platform.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Save Settings
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
