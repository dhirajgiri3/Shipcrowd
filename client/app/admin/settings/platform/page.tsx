'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/core/Button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/core/Card';
import { Input } from '@/components/ui/core/Input';
import { Label } from '@/components/ui/core/Label';
import { Badge } from '@/components/ui/core/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/core/Tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/feedback/Dialog';
import {
    usePlatformSettings,
    useUpdatePlatformSettings,
    useTestIntegration,
} from '@/src/core/api/hooks/useSettings';
import type { UpdatePlatformSettingsRequest } from '@/src/types/api/settings.types';
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
import { toast } from 'sonner';

export default function PlatformSettingsPage() {
    const { data: settings, isLoading } = usePlatformSettings();
    const updateSettings = useUpdatePlatformSettings();
    const testIntegration = useTestIntegration();

    const [formData, setFormData] = useState<UpdatePlatformSettingsRequest>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

    // Initialize form when settings load
    useState(() => {
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
    });

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
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Platform Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Configure platform-wide settings and integrations
                    </p>
                </div>
                <Button onClick={() => setShowConfirmDialog(true)} disabled={!hasChanges}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                </Button>
            </div>

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
                                    <select
                                        id="currency"
                                        className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                                        value={
                                            formData.financial?.currency ||
                                            settings.financial.currency
                                        }
                                        onChange={(e) =>
                                            handleChange('financial', 'currency', e.target.value)
                                        }
                                    >
                                        <option value="INR">INR (₹)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                    </select>
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

                            <div className="border-t pt-4 space-y-4">
                                <h4 className="font-medium">GST Configuration</h4>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="gstEnabled"
                                        checked={
                                            formData.financial?.gstEnabled ??
                                            settings.financial.gstEnabled
                                        }
                                        onChange={(e) =>
                                            handleChange('financial', 'gstEnabled', e.target.checked)
                                        }
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="gstEnabled">Enable GST</Label>
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

                            <div className="border-t pt-4 space-y-4">
                                <h4 className="font-medium">COD Charges</h4>
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
                                    <select
                                        id="emailProvider"
                                        className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                                        value={
                                            formData.integrations?.email?.provider ||
                                            settings.integrations.email.provider
                                        }
                                        onChange={(e) =>
                                            handleIntegrationChange('email', 'provider', e.target.value)
                                        }
                                    >
                                        <option value="SMTP">SMTP</option>
                                        <option value="SENDGRID">SendGrid</option>
                                        <option value="AWS_SES">AWS SES</option>
                                        <option value="MAILGUN">Mailgun</option>
                                    </select>
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
                                <input
                                    type="checkbox"
                                    id="emailEnabled"
                                    checked={
                                        formData.integrations?.email?.isEnabled ??
                                        settings.integrations.email.isEnabled
                                    }
                                    onChange={(e) =>
                                        handleIntegrationChange('email', 'isEnabled', e.target.checked)
                                    }
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="emailEnabled">Enable Email Service</Label>
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
                                    <select
                                        id="smsProvider"
                                        className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                                        value={
                                            formData.integrations?.sms?.provider ||
                                            settings.integrations.sms.provider
                                        }
                                        onChange={(e) =>
                                            handleIntegrationChange('sms', 'provider', e.target.value)
                                        }
                                    >
                                        <option value="TWILIO">Twilio</option>
                                        <option value="AWS_SNS">AWS SNS</option>
                                        <option value="MSG91">MSG91</option>
                                        <option value="GUPSHUP">Gupshup</option>
                                    </select>
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
                                <input
                                    type="checkbox"
                                    id="smsEnabled"
                                    checked={
                                        formData.integrations?.sms?.isEnabled ??
                                        settings.integrations.sms.isEnabled
                                    }
                                    onChange={(e) =>
                                        handleIntegrationChange('sms', 'isEnabled', e.target.checked)
                                    }
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="smsEnabled">Enable SMS Service</Label>
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
                                    <input
                                        type="checkbox"
                                        id="emailNotifications"
                                        checked={
                                            formData.notifications?.emailEnabled ??
                                            settings.notifications.emailEnabled
                                        }
                                        onChange={(e) =>
                                            handleChange('notifications', 'emailEnabled', e.target.checked)
                                        }
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="emailNotifications">
                                        Enable Email Notifications
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="smsNotifications"
                                        checked={
                                            formData.notifications?.smsEnabled ??
                                            settings.notifications.smsEnabled
                                        }
                                        onChange={(e) =>
                                            handleChange('notifications', 'smsEnabled', e.target.checked)
                                        }
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="smsNotifications">Enable SMS Notifications</Label>
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-3">
                                <h4 className="font-medium">Event Notifications</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="notifyOrderCreated"
                                            checked={
                                                formData.notifications?.notifyOnOrderCreated ??
                                                settings.notifications.notifyOnOrderCreated
                                            }
                                            onChange={(e) =>
                                                handleChange(
                                                    'notifications',
                                                    'notifyOnOrderCreated',
                                                    e.target.checked
                                                )
                                            }
                                            className="h-4 w-4"
                                        />
                                        <Label htmlFor="notifyOrderCreated">Order Created</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="notifyShipmentStatus"
                                            checked={
                                                formData.notifications?.notifyOnShipmentStatusChange ??
                                                settings.notifications.notifyOnShipmentStatusChange
                                            }
                                            onChange={(e) =>
                                                handleChange(
                                                    'notifications',
                                                    'notifyOnShipmentStatusChange',
                                                    e.target.checked
                                                )
                                            }
                                            className="h-4 w-4"
                                        />
                                        <Label htmlFor="notifyShipmentStatus">
                                            Shipment Status Change
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="notifyPayment"
                                            checked={
                                                formData.notifications?.notifyOnPaymentReceived ??
                                                settings.notifications.notifyOnPaymentReceived
                                            }
                                            onChange={(e) =>
                                                handleChange(
                                                    'notifications',
                                                    'notifyOnPaymentReceived',
                                                    e.target.checked
                                                )
                                            }
                                            className="h-4 w-4"
                                        />
                                        <Label htmlFor="notifyPayment">Payment Received</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="notifyKYC"
                                            checked={
                                                formData.notifications?.notifyOnKYCStatusChange ??
                                                settings.notifications.notifyOnKYCStatusChange
                                            }
                                            onChange={(e) =>
                                                handleChange(
                                                    'notifications',
                                                    'notifyOnKYCStatusChange',
                                                    e.target.checked
                                                )
                                            }
                                            className="h-4 w-4"
                                        />
                                        <Label htmlFor="notifyKYC">KYC Status Change</Label>
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
