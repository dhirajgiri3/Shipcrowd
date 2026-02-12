"use client";

import { useEffect, useState } from 'react';
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
import { CourierServiceItem } from '@/src/core/api/hooks/admin';
import { Save } from 'lucide-react';
import { Select } from '@/src/components/ui/form/Select';

interface ServiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: CourierServiceItem | null;
    onSave: (data: ServiceForm) => Promise<void>;
    isSaving?: boolean;
}

export type ServiceForm = {
    provider: 'velocity' | 'delhivery' | 'ekart';
    displayName: string;
    serviceCode: string;
    providerServiceId: string;
    serviceType: 'surface' | 'express' | 'air' | 'standard';
    zoneSupport: string;
    minWeightKg: string;
    maxWeightKg: string;
    maxCodValue: string;
    maxPrepaidValue: string;
    paymentModes: Array<'cod' | 'prepaid'>;
    eddMinDays: string;
    eddMaxDays: string;
};

const defaultForm: ServiceForm = {
    provider: 'delhivery',
    displayName: '',
    serviceCode: '',
    providerServiceId: '',
    serviceType: 'surface',
    zoneSupport: 'A,B,C,D,E',
    minWeightKg: '',
    maxWeightKg: '',
    maxCodValue: '',
    maxPrepaidValue: '',
    paymentModes: ['prepaid'],
    eddMinDays: '',
    eddMaxDays: '',
};

const providerOptions = [
    { label: 'Delhivery', value: 'delhivery' },
    { label: 'Ekart', value: 'ekart' },
    { label: 'Velocity', value: 'velocity' },
];

const serviceTypeOptions = [
    { label: 'Surface', value: 'surface' },
    { label: 'Express', value: 'express' },
    { label: 'Air', value: 'air' },
    { label: 'Standard', value: 'standard' },
];

export function ServiceDialog({
    open,
    onOpenChange,
    initialData,
    onSave,
    isSaving
}: ServiceDialogProps) {
    const [form, setForm] = useState<ServiceForm>(defaultForm);

    useEffect(() => {
        if (open) {
            if (initialData) {
                const paymentModes = (initialData.constraints?.paymentModes || []).filter(
                    (mode): mode is 'cod' | 'prepaid' => mode === 'cod' || mode === 'prepaid'
                );
                setForm({
                    provider: initialData.provider,
                    displayName: initialData.displayName,
                    serviceCode: initialData.serviceCode,
                    providerServiceId: initialData.providerServiceId || '',
                    serviceType: initialData.serviceType,
                    zoneSupport: (initialData.zoneSupport || []).join(','),
                    minWeightKg: String(initialData.constraints?.minWeightKg ?? ''),
                    maxWeightKg: String(initialData.constraints?.maxWeightKg ?? ''),
                    maxCodValue: String(initialData.constraints?.maxCodValue ?? ''),
                    maxPrepaidValue: String(initialData.constraints?.maxPrepaidValue ?? ''),
                    paymentModes: paymentModes.length ? paymentModes : ['prepaid'],
                    eddMinDays: String(initialData.sla?.eddMinDays ?? ''),
                    eddMaxDays: String(initialData.sla?.eddMaxDays ?? ''),
                });
            } else {
                setForm(defaultForm);
            }
        }
    }, [open, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(form);
        onOpenChange(false);
    };

    const togglePaymentMode = (mode: 'cod' | 'prepaid') => {
        const hasMode = form.paymentModes.includes(mode);
        const nextModes = hasMode
            ? form.paymentModes.filter((item) => item !== mode)
            : [...form.paymentModes, mode];
        setForm({ ...form, paymentModes: nextModes });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                    <DialogDescription>
                        Configure service details, zone support, and SLA parameters.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="provider">Provider</Label>
                            <Select
                                id="provider"
                                options={providerOptions}
                                value={form.provider}
                                onChange={(e) => setForm({ ...form, provider: e.target.value as ServiceForm['provider'] })}
                                disabled={!!initialData}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="serviceType">Service Type</Label>
                            <Select
                                id="serviceType"
                                options={serviceTypeOptions}
                                value={form.serviceType}
                                onChange={(e) => setForm({ ...form, serviceType: e.target.value as ServiceForm['serviceType'] })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={form.displayName}
                                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                                placeholder="e.g. Express Air"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="serviceCode">Service Code</Label>
                            <Input
                                id="serviceCode"
                                value={form.serviceCode}
                                onChange={(e) => setForm({ ...form, serviceCode: e.target.value.toUpperCase() })}
                                placeholder="e.g. E_AIR"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="providerServiceId">Provider Service ID (Optional)</Label>
                        <Input
                            id="providerServiceId"
                            value={form.providerServiceId}
                            onChange={(e) => setForm({ ...form, providerServiceId: e.target.value })}
                            placeholder="e.g. SURFACE, EXPRESS, DLV_EXP"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="zoneSupport">Supported Zones (Comma separated)</Label>
                        <Input
                            id="zoneSupport"
                            value={form.zoneSupport}
                            onChange={(e) => setForm({ ...form, zoneSupport: e.target.value })}
                            placeholder="A, B, C, D, E"
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="minWeight">Min Kg</Label>
                            <Input
                                id="minWeight"
                                type="number"
                                step="0.1"
                                value={form.minWeightKg}
                                onChange={(e) => setForm({ ...form, minWeightKg: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxWeight">Max Kg</Label>
                            <Input
                                id="maxWeight"
                                type="number"
                                step="0.1"
                                value={form.maxWeightKg}
                                onChange={(e) => setForm({ ...form, maxWeightKg: e.target.value })}
                                placeholder="50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="eddMin">Min Days</Label>
                            <Input
                                id="eddMin"
                                type="number"
                                value={form.eddMinDays}
                                onChange={(e) => setForm({ ...form, eddMinDays: e.target.value })}
                                placeholder="2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="eddMax">Max Days</Label>
                            <Input
                                id="eddMax"
                                type="number"
                                value={form.eddMaxDays}
                                onChange={(e) => setForm({ ...form, eddMaxDays: e.target.value })}
                                placeholder="5"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="maxCodValue">COD Cap (INR)</Label>
                            <Input
                                id="maxCodValue"
                                type="number"
                                step="1"
                                min="0"
                                value={form.maxCodValue}
                                onChange={(e) => setForm({ ...form, maxCodValue: e.target.value })}
                                placeholder="e.g. 30000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxPrepaidValue">Prepaid Cap (INR)</Label>
                            <Input
                                id="maxPrepaidValue"
                                type="number"
                                step="1"
                                min="0"
                                value={form.maxPrepaidValue}
                                onChange={(e) => setForm({ ...form, maxPrepaidValue: e.target.value })}
                                placeholder="e.g. 50000"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Modes</Label>
                        <div className="flex items-center gap-4 rounded-md border border-[var(--border-subtle)] px-3 py-2">
                            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                                <input
                                    type="checkbox"
                                    checked={form.paymentModes.includes('prepaid')}
                                    onChange={() => togglePaymentMode('prepaid')}
                                />
                                Prepaid
                            </label>
                            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                                <input
                                    type="checkbox"
                                    checked={form.paymentModes.includes('cod')}
                                    onChange={() => togglePaymentMode('cod')}
                                />
                                COD
                            </label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Saving...' : initialData ? 'Update Service' : 'Create Service'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
