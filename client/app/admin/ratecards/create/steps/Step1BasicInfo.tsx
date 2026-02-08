"use client";

import { useMemo } from 'react';
import { Select } from '@/src/components/ui/form/Select';
import { Input } from '@/src/components/ui/core/Input';
import { useAdminCompanies } from '@/src/core/api/hooks/admin/companies/useCompanies';
import { useCouriers } from '@/src/core/api/hooks/admin/couriers/useCouriers';
import { RateCardFormData, shipmentTypes } from '../../components/ratecardWizard.utils';

interface Step1BasicInfoProps {
    formData: RateCardFormData;
    onChange: (field: keyof RateCardFormData, value: string | boolean) => void;
    categoryOptions?: string[];
    isReadOnly?: boolean;
}

export function Step1BasicInfo({ formData, onChange, categoryOptions = [], isReadOnly = false }: Step1BasicInfoProps) {
    const { data: companiesData, isLoading: companiesLoading } = useAdminCompanies({ limit: 100 });
    const { data: couriers = [], isLoading: couriersLoading } = useCouriers();

    const companies = companiesData?.companies || [];

    const selectedCourier = useMemo(
        () => couriers.find(courier => courier.id === formData.carrier),
        [couriers, formData.carrier]
    );

    const courierOptions = couriers.map(courier => ({
        label: courier.name,
        value: courier.id,
    }));

    const serviceOptions = selectedCourier?.services?.map(service => ({
        label: service,
        value: service,
    })) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isGeneric"
                    checked={formData.isGeneric}
                    onChange={(e) => onChange('isGeneric', e.target.checked)}
                    disabled={isReadOnly}
                    className="rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                />
                <label htmlFor="isGeneric" className="text-sm font-medium text-[var(--text-primary)]">
                    Generic Rate Card (applies to all couriers)
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Rate Card Name *</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        placeholder="e.g. Velocity Standard 2025"
                        disabled={isReadOnly}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Company *</label>
                    <Select
                        value={formData.companyId}
                        onChange={(e) => onChange('companyId', e.target.value)}
                        disabled={isReadOnly || companiesLoading}
                        options={[
                            { label: companiesLoading ? 'Loading companies...' : 'Select Company', value: '' },
                            ...companies.map(company => ({ label: company.name, value: company._id }))
                        ]}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Rate Card Category *</label>
                    <Input
                        list="ratecard-category-options"
                        value={formData.rateCardCategory}
                        onChange={(e) => onChange('rateCardCategory', e.target.value)}
                        placeholder="e.g. premium"
                        disabled={isReadOnly}
                    />
                    {categoryOptions.length > 0 && (
                        <datalist id="ratecard-category-options">
                            {categoryOptions.map(category => (
                                <option key={category} value={category} />
                            ))}
                        </datalist>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Courier Provider *</label>
                    <Select
                        value={formData.carrier}
                        onChange={(e) => onChange('carrier', e.target.value)}
                        disabled={isReadOnly || formData.isGeneric || couriersLoading}
                        options={[
                            { label: couriersLoading ? 'Loading couriers...' : 'Select Courier', value: '' },
                            ...courierOptions
                        ]}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Courier Service *</label>
                    <Select
                        value={formData.serviceType}
                        onChange={(e) => onChange('serviceType', e.target.value)}
                        disabled={isReadOnly || formData.isGeneric || !selectedCourier}
                        options={[
                            { label: selectedCourier ? 'Select Service' : 'Select Courier First', value: '' },
                            ...serviceOptions
                        ]}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Status *</label>
                    <Select
                        value={formData.status}
                        onChange={(e) => onChange('status', e.target.value)}
                        disabled={isReadOnly}
                        options={[
                            { label: 'Active', value: 'active' },
                            { label: 'Inactive', value: 'inactive' },
                            { label: 'Draft', value: 'draft' }
                        ]}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Effective Start Date</label>
                    <Input
                        type="date"
                        value={formData.effectiveStartDate}
                        onChange={(e) => onChange('effectiveStartDate', e.target.value)}
                        disabled={isReadOnly}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Effective End Date</label>
                    <Input
                        type="date"
                        value={formData.effectiveEndDate}
                        onChange={(e) => onChange('effectiveEndDate', e.target.value)}
                        disabled={isReadOnly}
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
                                disabled={isReadOnly}
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
