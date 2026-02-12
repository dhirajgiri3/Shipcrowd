"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Label } from '@/src/components/ui/core/Label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/src/components/ui/feedback/Dialog';
import { useUpdateCourier } from '@/src/core/api/hooks/admin/couriers/useCouriers';
import type { CourierListItem } from '@/src/core/api/hooks/admin/couriers/useCouriers';
import type { Courier, UpdateCourierRequest } from '@/src/types/api/logistics';
import {
    Loader2,
    Eye,
    EyeOff,
    Globe,
    Key,
    User,
    Lock,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';

type ProviderCode = 'velocity' | 'delhivery' | 'ekart';

interface CourierCredentialsModalProps {
    isOpen: boolean;
    onClose: () => void;
    courier: Courier | CourierListItem | null;
}

interface FormState {
    apiEndpoint: string;
    apiKey: string;
    clientId: string;
    username: string;
    password: string;
}

const INITIAL_FORM: FormState = {
    apiEndpoint: '',
    apiKey: '',
    clientId: '',
    username: '',
    password: '',
};

export function CourierCredentialsModal({ isOpen, onClose, courier }: CourierCredentialsModalProps) {
    const updateCourier = useUpdateCourier();
    const [form, setForm] = useState<FormState>(INITIAL_FORM);

    // Password visibility states
    const [showApiKey, setShowApiKey] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showClientId, setShowClientId] = useState(false);

    const provider = (courier?.code?.toLowerCase() || '') as ProviderCode;
    const isVelocity = provider === 'velocity';
    const isDelhivery = provider === 'delhivery';
    const isEkart = provider === 'ekart';
    const hasSavedCredentials = Boolean((courier as Courier | null)?.credentialsConfigured);

    useEffect(() => {
        if (!isOpen || !courier) return;
        setForm({
            ...INITIAL_FORM,
            apiEndpoint: (courier as Courier).apiEndpoint || '',
        });
        // Reset visibility states on open
        setShowApiKey(false);
        setShowPassword(false);
        setShowClientId(false);
    }, [isOpen, courier]);

    const title = useMemo(() => {
        if (!courier) return 'Configure Courier';
        return `Configure ${courier.name}`;
    }, [courier]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!courier) return;

        const payload: UpdateCourierRequest = {
            apiEndpoint: form.apiEndpoint || undefined,
            credentials: {},
        };

        if (isDelhivery && form.apiKey.trim()) {
            payload.apiKey = form.apiKey.trim();
            payload.credentials = { apiKey: form.apiKey.trim() };
        }

        if (isVelocity) {
            payload.credentials = {
                username: form.username.trim() || undefined,
                password: form.password.trim() || undefined,
                apiKey: form.apiKey.trim() || undefined,
            };
        }

        if (isEkart) {
            payload.credentials = {
                clientId: form.clientId.trim() || undefined,
                username: form.username.trim() || undefined,
                password: form.password.trim() || undefined,
            };
        }

        await updateCourier.mutateAsync({
            id: courier.code.toLowerCase(),
            data: payload,
        });

        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-[var(--border-default)]">
                <DialogHeader className="p-6 pb-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
                    <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
                    <DialogDescription className="text-[var(--text-secondary)] mt-1.5">
                        Configure API connection details and credentials.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="p-6 space-y-6">
                        {/* Status Alert */}
                        {hasSavedCredentials ? (
                            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-3">
                                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Credentials Configured</h4>
                                    <p className="text-sm text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
                                        Secure credentials are saved. Leave fields blank to keep existing values, or enter new ones to rotate keys.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-[var(--text-secondary)] shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-[var(--text-primary)]">Setup Required</h4>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        Please provide the necessary credentials to enable this courier integration.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Base Configuration */}
                            <div className="space-y-4">
                                <Label htmlFor="apiEndpoint" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] ml-1 mb-2 block">
                                    Connection
                                </Label>
                                <div className="space-y-2">
                                    <Label htmlFor="apiEndpoint" className="text-sm font-medium">Base API URL</Label>
                                    <Input
                                        id="apiEndpoint"
                                        icon={<Globe className="h-4 w-4" />}
                                        placeholder="https://api.provider.com"
                                        value={form.apiEndpoint}
                                        onChange={(event) =>
                                            setForm((prev) => ({ ...prev, apiEndpoint: event.target.value }))
                                        }
                                        className="bg-[var(--bg-primary)]"
                                    />
                                </div>
                            </div>

                            {(isDelhivery || isVelocity || isEkart) && (
                                <div className="space-y-4">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] ml-1 mb-2 block">
                                        Credentials
                                    </Label>

                                    <div className="grid gap-4">
                                        {/* Username / Client ID */}
                                        {(isVelocity || isEkart) && (
                                            <div className="space-y-2">
                                                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                                                <Input
                                                    id="username"
                                                    icon={<User className="h-4 w-4" />}
                                                    placeholder={hasSavedCredentials ? '••••••••' : 'Enter username'}
                                                    value={form.username}
                                                    onChange={(event) =>
                                                        setForm((prev) => ({ ...prev, username: event.target.value }))
                                                    }
                                                    required={!hasSavedCredentials}
                                                    className="bg-[var(--bg-primary)]"
                                                />
                                            </div>
                                        )}

                                        {isEkart && (
                                            <div className="space-y-2">
                                                <Label htmlFor="clientId" className="text-sm font-medium">Client ID</Label>
                                                <Input
                                                    id="clientId"
                                                    type={showClientId ? "text" : "password"}
                                                    icon={<Key className="h-4 w-4" />}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowClientId(!showClientId)}
                                                            className="hover:text-[var(--text-primary)] focus:outline-none transition-colors"
                                                        >
                                                            {showClientId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    }
                                                    placeholder={hasSavedCredentials ? '••••••••' : 'Enter Client ID'}
                                                    value={form.clientId}
                                                    onChange={(event) =>
                                                        setForm((prev) => ({ ...prev, clientId: event.target.value }))
                                                    }
                                                    required={!hasSavedCredentials}
                                                    className="bg-[var(--bg-primary)]"
                                                />
                                            </div>
                                        )}

                                        {/* Password / API Key */}
                                        {(isVelocity || isEkart) && (
                                            <div className="space-y-2">
                                                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    icon={<Lock className="h-4 w-4" />}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="hover:text-[var(--text-primary)] focus:outline-none transition-colors"
                                                        >
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    }
                                                    placeholder={hasSavedCredentials ? '••••••••' : 'Enter password'}
                                                    value={form.password}
                                                    onChange={(event) =>
                                                        setForm((prev) => ({ ...prev, password: event.target.value }))
                                                    }
                                                    required={!hasSavedCredentials}
                                                    className="bg-[var(--bg-primary)]"
                                                />
                                            </div>
                                        )}

                                        {(isDelhivery || isVelocity) && (
                                            <div className="space-y-2">
                                                <Label htmlFor="apiKey" className="text-sm font-medium">
                                                    {isVelocity ? 'API Key (Optional)' : 'API Token'}
                                                </Label>
                                                <Input
                                                    id="apiKey"
                                                    type={showApiKey ? "text" : "password"}
                                                    icon={<Key className="h-4 w-4" />}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowApiKey(!showApiKey)}
                                                            className="hover:text-[var(--text-primary)] focus:outline-none transition-colors"
                                                        >
                                                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    }
                                                    placeholder={
                                                        hasSavedCredentials
                                                            ? '••••••••'
                                                            : (isVelocity ? 'Optional if username/password used' : 'Enter Delhivery token')
                                                    }
                                                    value={form.apiKey}
                                                    onChange={(event) =>
                                                        setForm((prev) => ({ ...prev, apiKey: event.target.value }))
                                                    }
                                                    required={isDelhivery && !hasSavedCredentials}
                                                    className="bg-[var(--bg-primary)]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={updateCourier.isPending}
                            className="bg-[var(--bg-primary)]"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateCourier.isPending || !courier}>
                            {updateCourier.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {hasSavedCredentials ? 'Update Configuration' : 'Save Configuration'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

