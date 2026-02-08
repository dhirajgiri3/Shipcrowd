"use client";

import { useEffect, useMemo } from 'react';
import { Input } from '@/src/components/ui/core/Input';
import { Select } from '@/src/components/ui/form/Select';
import { useCouriers } from '@/src/core/api/hooks/admin/couriers/useCouriers';
import { RateCardFormData, AdvancedBaseRate, AdvancedWeightRule, validateAdvancedSlabs } from '../../components/ratecardWizard.utils';

interface Step3WeightRulesProps {
    formData: RateCardFormData;
    onChange: (field: keyof RateCardFormData, value: RateCardFormData[keyof RateCardFormData]) => void;
    multipliers: Record<string, number>;
    isReadOnly?: boolean;
}

export function Step3WeightRules({ formData, onChange, multipliers, isReadOnly = false }: Step3WeightRulesProps) {
    const zoneAValue = parseFloat(formData.additionalZoneA) || 0;
    const { data: couriers = [] } = useCouriers();
    const advancedValidation = validateAdvancedSlabs(formData);
    const baseRateErrors = advancedValidation.baseRateErrors;
    const weightRuleErrors = advancedValidation.weightRuleErrors;
    const baseOverlapRows = useMemo(() => {
        const rows = new Set<number>();
        formData.advancedBaseRates.forEach((rate, index) => {
            const min = parseFloat(rate.minWeight || '0');
            const max = parseFloat(rate.maxWeight || '');
            if (!Number.isFinite(max) || max <= min) rows.add(index);
        });
        return rows;
    }, [formData.advancedBaseRates]);
    const weightOverlapRows = useMemo(() => {
        const rows = new Set<number>();
        formData.advancedWeightRules.forEach((rule, index) => {
            const min = parseFloat(rule.minWeight || '');
            const max = parseFloat(rule.maxWeight || '');
            const price = parseFloat(rule.pricePerKg || '');
            if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || !Number.isFinite(price)) rows.add(index);
        });
        return rows;
    }, [formData.advancedWeightRules]);

    const derivedZone = (zoneKey: string) => {
        const mult = multipliers[zoneKey];
        if (!mult || !zoneAValue) return '';
        return (zoneAValue * mult).toFixed(2);
    };

    const carrierOptions = [
        { label: 'Any Carrier', value: '' },
        ...couriers.map(courier => ({ label: courier.name, value: courier.id }))
    ];

    const serviceOptionsFor = (carrierId: string) => {
        const carrier = couriers.find(courier => courier.id === carrierId);
        if (!carrier) return [{ label: 'Any Service', value: '' }];
        return [
            { label: 'Any Service', value: '' },
            ...carrier.services.map(service => ({ label: service, value: service }))
        ];
    };

    const ensureAdvancedSeed = () => {
        const nextBaseRates: AdvancedBaseRate[] = formData.advancedBaseRates.length
            ? formData.advancedBaseRates
            : [{
                carrier: '',
                serviceType: '',
                basePrice: formData.basicZoneA || '',
                minWeight: '0',
                maxWeight: formData.basicWeight ? (parseFloat(formData.basicWeight) / 1000).toString() : '0.5'
            }];

        const addWeightGm = parseFloat(formData.additionalWeight) || 0;
        const addPriceA = parseFloat(formData.additionalZoneA) || 0;
        const pricePerKg = addWeightGm > 0 ? ((addPriceA / addWeightGm) * 1000).toFixed(2) : '';

        const nextWeightRules: AdvancedWeightRule[] = formData.advancedWeightRules.length
            ? formData.advancedWeightRules
            : [{
                carrier: '',
                serviceType: '',
                minWeight: formData.basicWeight ? (parseFloat(formData.basicWeight) / 1000).toString() : '0.5',
                maxWeight: '50',
                pricePerKg
            }];

        onChange('advancedBaseRates', nextBaseRates);
        onChange('advancedWeightRules', nextWeightRules);
    };

    useEffect(() => {
        if (!formData.useAdvancedPricing) return;
        if (formData.advancedBaseRates.length && formData.advancedWeightRules.length) return;
        ensureAdvancedSeed();
    }, [formData.useAdvancedPricing, formData.advancedBaseRates.length, formData.advancedWeightRules.length]);

    const updateBaseRate = (index: number, field: keyof AdvancedBaseRate, value: string) => {
        const next = [...formData.advancedBaseRates];
        next[index] = { ...next[index], [field]: value };
        onChange('advancedBaseRates', next);
    };

    const updateWeightRule = (index: number, field: keyof AdvancedWeightRule, value: string) => {
        const next = [...formData.advancedWeightRules];
        next[index] = { ...next[index], [field]: value };
        onChange('advancedWeightRules', next);
    };

    const addBaseRate = () => {
        const next = [...formData.advancedBaseRates, {
            carrier: '',
            serviceType: '',
            basePrice: '',
            minWeight: '0',
            maxWeight: '0.5'
        }];
        onChange('advancedBaseRates', next);
    };

    const addWeightRule = () => {
        const next = [...formData.advancedWeightRules, {
            carrier: '',
            serviceType: '',
            minWeight: '0.5',
            maxWeight: '50',
            pricePerKg: ''
        }];
        onChange('advancedWeightRules', next);
    };

    const removeBaseRate = (index: number) => {
        const next = formData.advancedBaseRates.filter((_, i) => i !== index);
        onChange('advancedBaseRates', next);
    };

    const removeWeightRule = (index: number) => {
        const next = formData.advancedWeightRules.filter((_, i) => i !== index);
        onChange('advancedWeightRules', next);
    };

    const handleDowngradeAdvanced = () => {
        onChange('useAdvancedPricing', false);
        onChange('advancedBaseRates', []);
        onChange('advancedWeightRules', []);
    };

    const sortBaseRates = () => {
        const next = [...formData.advancedBaseRates].sort((a, b) => {
            const keyA = `${a.carrier || 'any'}:${a.serviceType || 'any'}`;
            const keyB = `${b.carrier || 'any'}:${b.serviceType || 'any'}`;
            if (keyA !== keyB) return keyA.localeCompare(keyB);
            return (parseFloat(a.minWeight || '0') || 0) - (parseFloat(b.minWeight || '0') || 0);
        });
        onChange('advancedBaseRates', next);
    };

    const sortWeightRules = () => {
        const next = [...formData.advancedWeightRules].sort((a, b) => {
            const keyA = `${a.carrier || 'any'}:${a.serviceType || 'any'}`;
            const keyB = `${b.carrier || 'any'}:${b.serviceType || 'any'}`;
            if (keyA !== keyB) return keyA.localeCompare(keyB);
            return (parseFloat(a.minWeight || '0') || 0) - (parseFloat(b.minWeight || '0') || 0);
        });
        onChange('advancedWeightRules', next);
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Additional Weight Increment (grams) *</label>
                <Input
                    type="number"
                    value={formData.additionalWeight}
                    onChange={(e) => onChange('additionalWeight', e.target.value)}
                    placeholder="500"
                    className="mt-2"
                    disabled={isReadOnly}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">Charges are applied per increment in grams.</p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-4">
                    <div className="w-32 text-sm text-[var(--text-secondary)]">Zone A</div>
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">₹</span>
                        <Input
                            type="number"
                            value={formData.additionalZoneA}
                            onChange={(e) => onChange('additionalZoneA', e.target.value)}
                            placeholder="0"
                            className="pl-8"
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                {(['B', 'C', 'D', 'E'] as const).map(zone => (
                    <div key={zone} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-[var(--text-secondary)]">Zone {zone}</div>
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">₹</span>
                            <Input
                                type="number"
                                value={derivedZone(`zone${zone}`)}
                                readOnly
                                className="pl-8 bg-[var(--bg-secondary)]"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-xs text-[var(--text-muted)]">
                Enter price for Zone A only. Other zones are calculated using multipliers from Step 2.
            </div>

            {formData.useAdvancedPricing && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Advanced Carrier Slabs</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Per-carrier base rates and weight rules. Zone multipliers from Step 2 apply to each base rate.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                            <button
                                type="button"
                                onClick={ensureAdvancedSeed}
                                disabled={isReadOnly}
                                className="text-[var(--primary-blue)] hover:underline"
                            >
                                Fill from simple values
                            </button>
                            <button
                                type="button"
                                onClick={sortBaseRates}
                                disabled={isReadOnly}
                                className="text-[var(--primary-blue)] hover:underline"
                            >
                                Sort base slabs
                            </button>
                            <button
                                type="button"
                                onClick={sortWeightRules}
                                disabled={isReadOnly}
                                className="text-[var(--primary-blue)] hover:underline"
                            >
                                Sort weight slabs
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('advancedBaseRates', []);
                                    onChange('advancedWeightRules', []);
                                }}
                                disabled={isReadOnly}
                                className="text-[var(--text-muted)] hover:text-[var(--error)]"
                            >
                                Clear advanced slabs
                            </button>
                            <button
                                type="button"
                                onClick={handleDowngradeAdvanced}
                                disabled={isReadOnly}
                                className="text-[var(--text-muted)] hover:text-[var(--error)]"
                            >
                                Switch to simple
                            </button>
                        </div>
                    </div>

                    {(() => {
                        if (baseRateErrors.length === 0 && weightRuleErrors.length === 0) return null;
                        return (
                            <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning)] space-y-1">
                                {baseRateErrors.map((err, idx) => (
                                    <div key={`base-err-${idx}`}>{err}</div>
                                ))}
                                {weightRuleErrors.map((err, idx) => (
                                    <div key={`weight-err-${idx}`}>{err}</div>
                                ))}
                            </div>
                        );
                    })()}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Base Rates (kg)</h5>
                                <button
                                    type="button"
                                    onClick={addBaseRate}
                                    disabled={isReadOnly}
                                    className="text-xs text-[var(--primary-blue)] hover:underline"
                                >
                                    + Add Base Rate
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.advancedBaseRates.map((rate, index) => (
                                    <div
                                        key={`base-${index}`}
                                        className={`grid grid-cols-1 md:grid-cols-[1.3fr_1.3fr_1fr_1fr_1fr_auto] gap-2 items-end rounded-lg p-2 ${baseOverlapRows.has(index) ? 'border border-[var(--warning-border)] bg-[var(--warning-bg)]/30' : ''}`}
                                    >
                                        <Select
                                            value={rate.carrier}
                                            onChange={(e) => updateBaseRate(index, 'carrier', e.target.value)}
                                            disabled={isReadOnly}
                                            options={carrierOptions}
                                        />
                                        <Select
                                            value={rate.serviceType}
                                            onChange={(e) => updateBaseRate(index, 'serviceType', e.target.value)}
                                            disabled={isReadOnly}
                                            options={serviceOptionsFor(rate.carrier)}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Base ₹"
                                            value={rate.basePrice}
                                            onChange={(e) => updateBaseRate(index, 'basePrice', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Min kg"
                                            value={rate.minWeight}
                                            onChange={(e) => updateBaseRate(index, 'minWeight', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Max kg"
                                            value={rate.maxWeight}
                                            onChange={(e) => updateBaseRate(index, 'maxWeight', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeBaseRate(index)}
                                            disabled={isReadOnly || formData.advancedBaseRates.length <= 1}
                                            className="text-xs text-[var(--text-muted)] hover:text-[var(--error)]"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Weight Rules (kg)</h5>
                                <button
                                    type="button"
                                    onClick={addWeightRule}
                                    disabled={isReadOnly}
                                    className="text-xs text-[var(--primary-blue)] hover:underline"
                                >
                                    + Add Weight Rule
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.advancedWeightRules.map((rule, index) => (
                                    <div
                                        key={`weight-${index}`}
                                        className={`grid grid-cols-1 md:grid-cols-[1.3fr_1.3fr_1fr_1fr_1fr_auto] gap-2 items-end rounded-lg p-2 ${weightOverlapRows.has(index) ? 'border border-[var(--warning-border)] bg-[var(--warning-bg)]/30' : ''}`}
                                    >
                                        <Select
                                            value={rule.carrier}
                                            onChange={(e) => updateWeightRule(index, 'carrier', e.target.value)}
                                            disabled={isReadOnly}
                                            options={carrierOptions}
                                        />
                                        <Select
                                            value={rule.serviceType}
                                            onChange={(e) => updateWeightRule(index, 'serviceType', e.target.value)}
                                            disabled={isReadOnly}
                                            options={serviceOptionsFor(rule.carrier)}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Min kg"
                                            value={rule.minWeight}
                                            onChange={(e) => updateWeightRule(index, 'minWeight', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Max kg"
                                            value={rule.maxWeight}
                                            onChange={(e) => updateWeightRule(index, 'maxWeight', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="₹/kg"
                                            value={rule.pricePerKg}
                                            onChange={(e) => updateWeightRule(index, 'pricePerKg', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeWeightRule(index)}
                                            disabled={isReadOnly || formData.advancedWeightRules.length <= 1}
                                            className="text-xs text-[var(--text-muted)] hover:text-[var(--error)]"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
