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
import { Badge } from '@/components/ui/core/Badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/feedback/Dialog';
import {
    useFeatureFlags,
    useToggleFeature,
    useBulkUpdateFeatures,
} from '@/src/core/api/hooks/useSettings';
import type { FeatureFlags } from '@/src/types/api/settings.types';
import {
    Save,
    Shield,
    Truck,
    CreditCard,
    Globe,
    AlertTriangle,
    Database,
    Zap,
    Box,
    FileText,
    Activity,
} from 'lucide-react';

export default function FeatureFlagsPage() {
    const { data: features, isLoading } = useFeatureFlags();
    const toggleFeature = useToggleFeature();
    const bulkUpdate = useBulkUpdateFeatures();

    const [pendingToggles, setPendingToggles] = useState<Partial<FeatureFlags>>({});
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [featureToToggle, setFeatureToToggle] = useState<{
        key: keyof FeatureFlags;
        label: string;
        enabled: boolean;
    } | null>(null);

    const FEATURE_CONFIG: Record<
        Exclude<keyof FeatureFlags, 'updatedAt' | 'updatedBy'>,
        { label: string; description: string; icon: any; category: 'core' | 'system' | 'beta' }
    > = {
        returnsEnabled: {
            label: 'Returns Management',
            description: 'Enable return shipment processing and management',
            icon: Box,
            category: 'core',
        },
        codEnabled: {
            label: 'Cash on Delivery (COD)',
            description: 'Enable COD payment option and remittance tracking',
            icon: CreditCard,
            category: 'core',
        },
        integrationsEnabled: {
            label: 'E-commerce Integrations',
            description: 'Allow connection with Shopify, WooCommerce, etc.',
            icon: Globe,
            category: 'core',
        },
        trackingEnabled: {
            label: 'Real-time Tracking',
            description: 'Enable shipment tracking updates and notifications',
            icon: Truck,
            category: 'core',
        },
        fraudDetectionEnabled: {
            label: 'Fraud Detection',
            description: 'AI-powered fraud analysis for shipments',
            icon: Shield,
            category: 'system',
        },
        ndrEnabled: {
            label: 'NDR Management',
            description: 'Non-Delivery Report processing workflow',
            icon: Activity,
            category: 'core',
        },
        rateCardManagement: {
            label: 'Rate Card Management',
            description: 'Dynamic shipping rate calculation engine',
            icon: FileText,
            category: 'system',
        },
        bulkOperations: {
            label: 'Bulk Operations',
            description: 'Allow bulk upload of orders and shipments',
            icon: Database,
            category: 'system',
        },
        apiAccess: {
            label: 'API Access',
            description: 'Enable public API access for merchants',
            icon: Zap,
            category: 'system',
        },
        maintenanceMode: {
            label: 'Maintenance Mode',
            description: 'Put the platform in maintenance mode (Admins only)',
            icon: AlertTriangle,
            category: 'system',
        },
    };

    type FeatureFlagKey = Exclude<keyof FeatureFlags, 'updatedAt' | 'updatedBy'>;

    const handleToggle = (key: FeatureFlagKey, currentStatus: boolean) => {
        // For critical features, show confirmation immediately
        if (key === 'maintenanceMode' || key === 'apiAccess') {
            setFeatureToToggle({
                key,
                label: FEATURE_CONFIG[key].label,
                enabled: !currentStatus,
            });
            setShowConfirmDialog(true);
        } else {
            // For others, toggle immediately via API
            toggleFeature.mutate({ feature: key, enabled: !currentStatus });
        }
    };

    const confirmToggle = async () => {
        if (featureToToggle) {
            await toggleFeature.mutateAsync({
                feature: featureToToggle.key,
                enabled: featureToToggle.enabled,
            });
            setFeatureToToggle(null);
            setShowConfirmDialog(false);
        }
    };

    if (isLoading || !features) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading feature flags...</p>
            </div>
        );
    }

    const renderFeatureCard = (key: FeatureFlagKey) => {
        const config = FEATURE_CONFIG[key];
        // Handle case where key might not be in config (if types change)
        if (!config) return null;

        const Icon = config.icon;
        const isEnabled = typeof features[key] === 'boolean' ? features[key] : false;

        return (
            <div
                key={key}
                className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
            >
                <div className="flex gap-4">
                    <div
                        className={`p-2 rounded-full ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}
                    >
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-medium flex items-center gap-2">
                            {config.label}
                            {key === 'maintenanceMode' && isEnabled && (
                                <Badge variant="warning" className="text-xs">
                                    Active
                                </Badge>
                            )}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">
                        {isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                        onClick={() => handleToggle(key, isEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isEnabled ? 'bg-primary' : 'bg-input'
                            }`}
                    >
                        <span
                            className={`${isEnabled ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-background transition-transform`}
                        />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Feature Management</h1>
                <p className="text-muted-foreground mt-1">
                    Control system-wide feature availability and modules
                </p>
            </div>

            {/* Core Features */}
            <Card>
                <CardHeader>
                    <CardTitle>Core Modules</CardTitle>
                    <CardDescription>Essential shipping and logistics features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(Object.keys(FEATURE_CONFIG) as Array<FeatureFlagKey>)
                        .filter((key) => FEATURE_CONFIG[key].category === 'core')
                        .map((key) => renderFeatureCard(key))}
                </CardContent>
            </Card>

            {/* System Features */}
            <Card>
                <CardHeader>
                    <CardTitle>System Capabilities</CardTitle>
                    <CardDescription>
                        Technical and operational settings affecting the platform
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(Object.keys(FEATURE_CONFIG) as Array<FeatureFlagKey>)
                        .filter((key) => FEATURE_CONFIG[key].category === 'system')
                        .map((key) => renderFeatureCard(key))}
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-warning" />
                            Confirm Action
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to{' '}
                            <strong>{featureToToggle?.enabled ? 'enable' : 'disable'}</strong>{' '}
                            {featureToToggle?.label}?
                            {featureToToggle?.key === 'maintenanceMode' && featureToToggle.enabled && (
                                <p className="mt-2 text-warning font-medium">
                                    Warning: This will prevent non-admin users from accessing the platform.
                                </p>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={featureToToggle?.enabled ? 'primary' : 'danger'}
                            onClick={confirmToggle}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
