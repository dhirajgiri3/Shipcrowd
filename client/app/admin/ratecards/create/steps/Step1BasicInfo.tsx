"use client";

import { Select } from '@/src/components/ui/form/Select';
import { RateCardFormData, courierOptions, rateCardCategories, shipmentTypes } from '../../components/ratecardWizard.utils';

interface Step1BasicInfoProps {
    formData: RateCardFormData;
    onChange: (field: keyof RateCardFormData, value: string | boolean) => void;
}

export function Step1BasicInfo({ formData, onChange }: Step1BasicInfoProps) {
    const selectedCourier = courierOptions.find(c => c.id === formData.courierProviderId);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isGeneric"
                    checked={formData.isGeneric}
                    onChange={(e) => onChange('isGeneric', e.target.checked)}
                    className="rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                />
                <label htmlFor="isGeneric" className="text-sm font-medium text-[var(--text-primary)]">
                    Generic Rate Card (applies to all couriers)
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Courier Provider *</label>
                    <Select
                        value={formData.courierProviderId}
                        onChange={(e) => onChange('courierProviderId', e.target.value)}
                        disabled={formData.isGeneric}
                        options={[
                            { label: 'Select Courier', value: '' },
                            ...courierOptions.map(c => ({ label: c.name, value: c.id }))
                        ]}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Courier Service *</label>
                    <Select
                        value={formData.courierServiceId}
                        onChange={(e) => onChange('courierServiceId', e.target.value)}
                        disabled={!selectedCourier || formData.isGeneric}
                        options={[
                            { label: 'Select Service', value: '' },
                            ...(selectedCourier?.services.map(s => ({ label: s, value: s.toLowerCase() })) || [])
                        ]}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Rate Card Category *</label>
                    <Select
                        value={formData.rateCardCategory}
                        onChange={(e) => onChange('rateCardCategory', e.target.value)}
                        options={[
                            { label: 'Select Category', value: '' },
                            ...rateCardCategories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))
                        ]}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Status *</label>
                    <Select
                        value={formData.status}
                        onChange={(e) => onChange('status', e.target.value)}
                        options={[
                            { label: 'Active', value: 'active' },
                            { label: 'Inactive', value: 'inactive' },
                            { label: 'Draft', value: 'draft' }
                        ]}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Shipment Type *</label>
                <div className="flex gap-4">
                    {shipmentTypes.map(type => (
                        <label key={type} className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name="shipmentType"
                                value={type}
                                checked={formData.shipmentType === type}
                                onChange={() => onChange('shipmentType', type)}
                                className="text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
