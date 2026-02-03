"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    CreditCard,
    ArrowLeft,
    Save,
    Truck,
    Package,
    IndianRupee,
    Info,
    Plus,
    Trash2
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import Link from 'next/link';
import { useCreateRateCard } from '@/src/hooks/shipping/use-create-rate-card';
import { useRouter } from 'next/navigation';

// Mock couriers for dropdown
const couriers = [
    { id: 'delhivery', name: 'Delhivery', services: ['Surface', 'Air', 'Express'] },
    { id: 'xpressbees', name: 'Xpressbees', services: ['Surface', 'Air'] },
    { id: 'dtdc', name: 'DTDC', services: ['Surface', 'Air', 'Express', 'Ground'] },
    { id: 'bluedart', name: 'Bluedart', services: ['Express', 'Dart Apex'] },
    { id: 'ecom-express', name: 'Ecom Express', services: ['Standard', 'Express'] },
];

const categories = ['lite', 'basic', 'advanced', 'pro', 'enterprise', 'premium'];
const shipmentTypes = ['forward', 'reverse'];
const zoneMappings = ['state', 'region'];

export function CreateRatecardClient() {
    const { addToast } = useToast();
    const router = useRouter();
    const { mutate: createRateCard, isPending } = useCreateRateCard();
    const [selectedCourier, setSelectedCourier] = useState('');
    const [formData, setFormData] = useState({
        courierProviderId: '',
        courierServiceId: '',
        rateCardCategory: '',
        shipmentType: 'forward',
        gst: '18',
        minimumFare: '',
        minimumFareCalculatedOn: 'freight',
        zoneBType: 'state',
        isWeightConstraint: false,
        minWeight: '',
        maxWeight: '',
        status: 'active',
        // Basic slab
        basicWeight: '500',
        basicZoneA: '',
        basicZoneB: '',
        basicZoneC: '',
        basicZoneD: '',
        basicZoneE: '',
        // Additional slab
        isGeneric: false, // New state for Generic Rate Cards

        // Additional slab
        additionalWeight: '500',
        additionalZoneA: '',
        additionalZoneB: '',
        additionalZoneC: '',
        additionalZoneD: '',
        additionalZoneE: '',
        // Overhead charges
        codPercentage: '2.5',
        codMinimumCharge: '25',
    });

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'courierProviderId') {
            setSelectedCourier(value as string);
            setFormData(prev => ({ ...prev, courierServiceId: '' }));
        }
    };

    const selectedCourierData = couriers.find(c => c.id === selectedCourier);

    const handleSubmit = () => {
        // Validation
        if (!formData.isGeneric && (!formData.courierProviderId || !formData.courierServiceId)) {
            addToast('Please select a courier and service, or choose "Generic Rate Card"', 'error');
            return;
        }
        if (!formData.rateCardCategory) {
            addToast('Please select a rate card category', 'error');
            return;
        }

        if (!formData.basicZoneA || !formData.basicZoneB) {
            addToast('Please set at least Zone A and Zone B rates', 'error');
            return;
        }

        // Calculate Multipliers based on Zone A Baseline
        const basePrice = parseFloat(formData.basicZoneA) || 0;
        const multipliers: Record<string, number> = { zoneA: 1.0 };

        if (basePrice > 0) {
            multipliers.zoneB = parseFloat((parseFloat(formData.basicZoneB) / basePrice).toFixed(2));
            multipliers.zoneC = parseFloat((parseFloat(formData.basicZoneC) / basePrice).toFixed(2));
            multipliers.zoneD = parseFloat((parseFloat(formData.basicZoneD) / basePrice).toFixed(2));
            multipliers.zoneE = parseFloat((parseFloat(formData.basicZoneE) / basePrice).toFixed(2));
        }

        // Calculate Price Per Kg for Additional Weight
        // UI asks for "Price per X gm". Backend expects "Price per 1 Kg".
        const addWeightGm = parseFloat(formData.additionalWeight) || 500;
        const addPriceA = parseFloat(formData.additionalZoneA) || 0;
        const pricePerKg = addPriceA > 0 ? (addPriceA / addWeightGm) * 1000 : 0;

        // Transform to API format (Model-compliant)
        const payload = {
            name: formData.isGeneric
                ? `GENERIC ${formData.rateCardCategory} ${Date.now()}`
                : `${selectedCourierData?.name} ${formData.courierServiceId} ${formData.rateCardCategory} ${Date.now()}`,
            courierProviderId: formData.isGeneric ? null : formData.courierProviderId,
            courierServiceId: formData.isGeneric ? null : formData.courierServiceId,
            rateCardCategory: formData.rateCardCategory,
            shipmentType: formData.shipmentType as 'forward' | 'reverse',
            gst: parseFloat(formData.gst),
            minimumFare: parseFloat(formData.minimumFare) || 0,
            minimumFareCalculatedOn: formData.minimumFareCalculatedOn as 'freight' | 'freight_overhead',
            zoneBType: formData.zoneBType as 'state' | 'region',
            isWeightConstraint: formData.isWeightConstraint,
            minWeight: formData.minWeight ? parseFloat(formData.minWeight) : undefined,
            maxWeight: formData.maxWeight ? parseFloat(formData.maxWeight) : undefined,
            status: formData.status as 'active' | 'inactive',

            // Backend Model Structure
            baseRates: [{
                carrier: formData.isGeneric ? undefined : formData.courierProviderId, // or name
                serviceType: formData.isGeneric ? undefined : formData.courierServiceId,
                basePrice: basePrice,
                minWeight: 0,
                maxWeight: parseFloat(formData.basicWeight) / 1000 // Convert gm to kg
            }],

            weightRules: [{
                minWeight: parseFloat(formData.basicWeight) / 1000,
                maxWeight: 1000, // Upper limit
                pricePerKg: pricePerKg,
                carrier: formData.isGeneric ? undefined : formData.courierProviderId,
                serviceType: formData.isGeneric ? undefined : formData.courierServiceId
            }],

            zoneMultipliers: multipliers,

            codPercentage: parseFloat(formData.codPercentage),
            codMinimumCharge: parseFloat(formData.codMinimumCharge),

            // Required Dates
            effectiveDates: {
                startDate: new Date().toISOString()
            }
        };

        createRateCard(payload, {
            onSuccess: () => {
                addToast('Rate card created successfully!', 'success');
                router.push('/admin/ratecards');
            },
            onError: (error: any) => {
                addToast(error?.response?.data?.message || 'Failed to create rate card', 'error');
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/ratecards">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <CreditCard className="h-6 w-6 text-[var(--primary-blue)]" />
                            Create Rate Card
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                            Define pricing for a courier service
                        </p>
                    </div>
                </div>
                <Button onClick={handleSubmit} disabled={isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {isPending ? 'Saving...' : 'Save Rate Card'}
                </Button>
            </div>

            {/* Basic Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Truck className="h-5 w-5 text-[var(--primary-blue)]" />
                        Basic Configuration
                    </CardTitle>
                    <CardDescription>Select courier and service details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2 pt-6">
                            <input
                                type="checkbox"
                                id="isGeneric"
                                className="rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                                checked={formData.isGeneric}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setFormData(prev => ({
                                        ...prev,
                                        isGeneric: isChecked,
                                        // Reset courier selection if generic is checked
                                        courierProviderId: isChecked ? '' : prev.courierProviderId,
                                        courierServiceId: isChecked ? '' : prev.courierServiceId
                                    }));
                                    if (isChecked) setSelectedCourier('');
                                }}
                            />
                            <label htmlFor="isGeneric" className="text-sm font-medium text-[var(--text-primary)] select-none cursor-pointer">
                                Generic Rate Card (Apply to all couriers)
                            </label>
                        </div>

                        {/* Courier Provider */}
                        <div className="space-y-2">
                            <label className={`text-sm font-medium ${formData.isGeneric ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>Courier Provider *</label>
                            <select
                                value={formData.courierProviderId}
                                onChange={(e) => handleInputChange('courierProviderId', e.target.value)}
                                disabled={formData.isGeneric}
                                className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)] disabled:opacity-50 disabled:bg-[var(--bg-tertiary)]"
                            >
                                <option value="">Select Courier</option>
                                {couriers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Courier Service */}
                        <div className="space-y-2">
                            <label className={`text-sm font-medium ${formData.isGeneric ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>Courier Service *</label>
                            <select
                                value={formData.courierServiceId}
                                onChange={(e) => handleInputChange('courierServiceId', e.target.value)}
                                disabled={!selectedCourierData || formData.isGeneric}
                                className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)] disabled:opacity-50 disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed"
                            >
                                <option value="">Select Service</option>
                                {selectedCourierData?.services.map((s) => (
                                    <option key={s} value={s.toLowerCase()}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Rate Card Category *</label>
                            <select
                                value={formData.rateCardCategory}
                                onChange={(e) => handleInputChange('rateCardCategory', e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)] capitalize"
                            >
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                    <option key={c} value={c} className="capitalize">{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Shipment Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Shipment Type *</label>
                            <select
                                value={formData.shipmentType}
                                onChange={(e) => handleInputChange('shipmentType', e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)] capitalize"
                            >
                                {shipmentTypes.map((t) => (
                                    <option key={t} value={t} className="capitalize">{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                        {/* GST */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">GST % *</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={formData.gst}
                                    onChange={(e) => handleInputChange('gst', e.target.value)}
                                    placeholder="18"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">%</span>
                            </div>
                        </div>

                        {/* Minimum Fare Calculated On */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Min Fare Based On *</label>
                            <select
                                value={formData.minimumFareCalculatedOn}
                                onChange={(e) => handleInputChange('minimumFareCalculatedOn', e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)]"
                            >
                                <option value="freight">Freight</option>
                                <option value="freight_overhead">Freight + Overhead</option>
                            </select>
                        </div>

                        {/* Minimum Fare */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Minimum Fare *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">₹</span>
                                <Input
                                    type="number"
                                    value={formData.minimumFare}
                                    onChange={(e) => handleInputChange('minimumFare', e.target.value)}
                                    placeholder="35"
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Status *</label>
                            <select
                                value={formData.status}
                                onChange={(e) => handleInputChange('status', e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)] capitalize"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Zone Mapping & Weight Constraints */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Zone B Mapping *</label>
                            <select
                                value={formData.zoneBType}
                                onChange={(e) => handleInputChange('zoneBType', e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)] capitalize"
                            >
                                {zoneMappings.map((z) => (
                                    <option key={z} value={z} className="capitalize">{z}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Weight Constraint?</label>
                            <select
                                value={formData.isWeightConstraint ? 'yes' : 'no'}
                                onChange={(e) => handleInputChange('isWeightConstraint', e.target.value === 'yes')}
                                className="flex h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)]"
                            >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                        </div>

                        {formData.isWeightConstraint && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-secondary)]">Min Weight (gm)</label>
                                    <Input
                                        type="number"
                                        value={formData.minWeight}
                                        onChange={(e) => handleInputChange('minWeight', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Zone Pricing - Basic Slab */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <IndianRupee className="h-5 w-5 text-[var(--primary-blue)]" />
                        Zone Pricing - Basic Slab
                    </CardTitle>
                    <CardDescription>Base price for the first weight unit</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Weight (gm) *</label>
                            <Input
                                type="number"
                                value={formData.basicWeight}
                                onChange={(e) => handleInputChange('basicWeight', e.target.value)}
                                placeholder="500"
                            />
                        </div>
                        {['A', 'B', 'C', 'D', 'E'].map((zone) => (
                            <div key={zone} className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Zone {zone} *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">₹</span>
                                    <Input
                                        type="number"
                                        value={(formData as any)[`basicZone${zone}`]}
                                        onChange={(e) => handleInputChange(`basicZone${zone}`, e.target.value)}
                                        placeholder="0"
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Zone Pricing - Additional Slab */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Plus className="h-5 w-5 text-[var(--primary-blue)]" />
                        Zone Pricing - Additional Slab
                    </CardTitle>
                    <CardDescription>Price for each additional weight unit</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Weight (gm) *</label>
                            <Input
                                type="number"
                                value={formData.additionalWeight}
                                onChange={(e) => handleInputChange('additionalWeight', e.target.value)}
                                placeholder="500"
                            />
                        </div>
                        {['A', 'B', 'C', 'D', 'E'].map((zone) => (
                            <div key={zone} className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Zone {zone} *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">₹</span>
                                    <Input
                                        type="number"
                                        value={(formData as any)[`additionalZone${zone}`]}
                                        onChange={(e) => handleInputChange(`additionalZone${zone}`, e.target.value)}
                                        placeholder="0"
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Overhead Charges */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5 text-[var(--primary-blue)]" />
                        Overhead Charges
                    </CardTitle>
                    <CardDescription>COD and other additional charges</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">COD Percentage *</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={formData.codPercentage}
                                    onChange={(e) => handleInputChange('codPercentage', e.target.value)}
                                    placeholder="2.5"
                                    step="0.1"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">COD Minimum Charge *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">₹</span>
                                <Input
                                    type="number"
                                    value={formData.codMinimumCharge}
                                    onChange={(e) => handleInputChange('codMinimumCharge', e.target.value)}
                                    placeholder="25"
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                <Link href="/admin/ratecards">
                    <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                </Link>
                <Button onClick={() => addToast('Rate card created successfully!', 'success')}>
                    <Save className="h-4 w-4 mr-2" />
                    Create Rate Card
                </Button>
            </div>
        </div >
    );
}
