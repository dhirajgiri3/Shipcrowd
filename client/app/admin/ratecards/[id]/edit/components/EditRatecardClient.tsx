"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Select } from '@/src/components/ui/form/Select';
import {
    CreditCard,
    ArrowLeft,
    Save,
    Truck,
    Package,
    IndianRupee,
    Plus,
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import Link from 'next/link';
import { useAdminRateCard, useUpdateAdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';
import { useRouter } from 'next/navigation';
import { Loader } from '@/src/components/ui/feedback/Loader';

// Mock couriers for dropdown (Same as Create)
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

interface EditRatecardClientProps {
    rateCardId: string;
}

export function EditRatecardClient({ rateCardId }: EditRatecardClientProps) {
    const { addToast } = useToast();
    const router = useRouter();

    // Fetch existing data
    const { data: rateCard, isLoading: isFetching } = useAdminRateCard(rateCardId);

    // Update mutation
    const { mutate: updateRateCard, isPending: isUpdating } = useUpdateAdminRateCard();

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
        isGeneric: false,
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

    // Populate form data when rateCard is fetched
    useEffect(() => {
        if (rateCard) {
            const baseRate = rateCard.baseRates?.[0];
            const weightRule = rateCard.weightRules?.[0];
            const isGeneric = rateCard.name.startsWith('GENERIC');

            // Determine multipliers (either from API or calculate from base rates if missing)
            // Ideally backend sends zoneMultipliers or we derive from zoneRules. 
            // For simplicity, we'll try to reconstruct from what we have or default to 1 if not calculable easily without all zone prices.
            // Actually, the create payload constructs multipliers. If we want to edit specific zone prices, we need to reverse engineering them from multipliers * basePrice?
            // "zoneMultipliers": { "zoneA": 1, "zoneB": 1.2 ... }

            // Since the UI inputs are "Price", not "Multiplier", we need to show Prices.
            // Price = BasePrice * Multiplier.
            const basePrice = baseRate?.basePrice || 0;
            const multipliers = rateCard.zoneMultipliers || { zoneA: 1 };

            setFormData({
                courierProviderId: baseRate?.carrier || '',
                courierServiceId: baseRate?.serviceType || '',
                rateCardCategory: extractCategory(rateCard.name) || '',
                shipmentType: 'forward', // Defaulting as specific field might be missing in interface but present in data
                gst: '18', // Default
                minimumFare: String(rateCard.minimumCall || rateCard.minimumFare || 0),
                minimumFareCalculatedOn: 'freight', // Default
                zoneBType: 'state', // Default
                isWeightConstraint: !!rateCard.weightRules?.some(r => r.minWeight > 0),
                minWeight: '0',
                maxWeight: '0',
                status: rateCard.status || 'active',

                isGeneric: isGeneric,

                // Basic slab
                basicWeight: String((baseRate?.maxWeight || 0.5) * 1000), // kg to gm
                basicZoneA: String(basePrice),
                basicZoneB: String((basePrice * (multipliers.zoneB || 0)).toFixed(2)),
                basicZoneC: String((basePrice * (multipliers.zoneC || 0)).toFixed(2)),
                basicZoneD: String((basePrice * (multipliers.zoneD || 0)).toFixed(2)),
                basicZoneE: String((basePrice * (multipliers.zoneE || 0)).toFixed(2)),

                // Additional slab
                additionalWeight: '500', // Default assumption
                additionalZoneA: String(((weightRule?.pricePerKg || 0) / 1000) * 500), // Price per kg -> price per 500g
                // Assuming same multipliers apply to additional weight for simplicity in this UI, 
                // or we set them to 0 if we can't derive. 
                additionalZoneB: '0',
                additionalZoneC: '0',
                additionalZoneD: '0',
                additionalZoneE: '0',

                // Overhead
                codPercentage: String(rateCard.codPercentage || 2.5),
                codMinimumCharge: String(rateCard.codMinimumCharge || 25),
            });

            if (baseRate?.carrier) setSelectedCourier(baseRate.carrier);
        }
    }, [rateCard]);

    const extractCategory = (name: string) => {
        return categories.find(c => name.toLowerCase().includes(c));
    };

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'courierProviderId') {
            setSelectedCourier(value as string);
            setFormData(prev => ({ ...prev, courierServiceId: '' }));
        }
    };

    const selectedCourierData = couriers.find(c => c.id === selectedCourier);

    const handleSubmit = () => {
        // Validation (Same as Create)
        if (!formData.isGeneric && (!formData.courierProviderId || !formData.courierServiceId)) {
            addToast('Please select a courier and service', 'error');
            return;
        }

        // Calculate Multipliers
        const basePrice = parseFloat(formData.basicZoneA) || 0;
        const multipliers: Record<string, number> = { zoneA: 1.0 };

        if (basePrice > 0) {
            multipliers.zoneB = parseFloat((parseFloat(formData.basicZoneB) / basePrice).toFixed(2));
            multipliers.zoneC = parseFloat((parseFloat(formData.basicZoneC) / basePrice).toFixed(2));
            multipliers.zoneD = parseFloat((parseFloat(formData.basicZoneD) / basePrice).toFixed(2));
            multipliers.zoneE = parseFloat((parseFloat(formData.basicZoneE) / basePrice).toFixed(2));
        }

        const addWeightGm = parseFloat(formData.additionalWeight) || 500;
        const addPriceA = parseFloat(formData.additionalZoneA) || 0;
        const pricePerKg = addPriceA > 0 ? (addPriceA / addWeightGm) * 1000 : 0;

        const payload: any = {
            name: formData.isGeneric
                ? `GENERIC ${formData.rateCardCategory} ${Date.now()}`
                : `${selectedCourierData?.name || formData.courierProviderId} ${formData.courierServiceId} ${formData.rateCardCategory} ${Date.now()}`,
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

            // Structure matches Create payload
            baseRates: [{
                carrier: formData.isGeneric ? undefined : formData.courierProviderId,
                serviceType: formData.isGeneric ? undefined : formData.courierServiceId,
                basePrice: basePrice,
                minWeight: 0,
                maxWeight: parseFloat(formData.basicWeight) / 1000
            }],
            weightRules: [{
                minWeight: parseFloat(formData.basicWeight) / 1000,
                maxWeight: 1000,
                pricePerKg: pricePerKg,
                carrier: formData.isGeneric ? undefined : formData.courierProviderId,
                serviceType: formData.isGeneric ? undefined : formData.courierServiceId
            }],
            zoneMultipliers: multipliers,
            codPercentage: parseFloat(formData.codPercentage),
            codMinimumCharge: parseFloat(formData.codMinimumCharge),
        };

        updateRateCard({ id: rateCardId, data: payload }, {
            onSuccess: () => {
                addToast('Rate card updated successfully!', 'success');
                router.push('/admin/ratecards');
            },
            onError: (error: any) => {
                addToast(error?.response?.data?.message || 'Failed to update rate card', 'error');
            }
        });
    };

    if (isFetching) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader className="h-8 w-8 text-[var(--primary-blue)]" />
            </div>
        );
    }

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
                            Edit Rate Card
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                            Modify pricing for this service
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={isUpdating}
                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/20"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdating ? 'Updating...' : 'Update Rate Card'}
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
                                        courierProviderId: isChecked ? '' : prev.courierProviderId,
                                        courierServiceId: isChecked ? '' : prev.courierServiceId
                                    }));
                                    if (isChecked) setSelectedCourier('');
                                }}
                            />
                            <label htmlFor="isGeneric" className="text-sm font-medium text-[var(--text-primary)] select-none cursor-pointer">
                                Generic Rate Card
                            </label>
                        </div>

                        {/* Courier Provider */}
                        <div className="space-y-2">
                            <label className={`text-sm font-medium ${formData.isGeneric ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>Courier Provider *</label>
                            <Select
                                value={formData.courierProviderId}
                                onChange={(e) => handleInputChange('courierProviderId', e.target.value)}
                                disabled={formData.isGeneric}
                                options={[
                                    { label: 'Select Courier', value: '' },
                                    ...couriers.map(c => ({ label: c.name, value: c.id }))
                                ]}
                            />
                        </div>

                        {/* Courier Service */}
                        <div className="space-y-2">
                            <label className={`text-sm font-medium ${formData.isGeneric ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>Courier Service *</label>
                            <Select
                                value={formData.courierServiceId}
                                onChange={(e) => handleInputChange('courierServiceId', e.target.value)}
                                disabled={!selectedCourierData || formData.isGeneric}
                                options={[
                                    { label: 'Select Service', value: '' },
                                    ...(selectedCourierData?.services.map(s => ({ label: s, value: s.toLowerCase() })) || [])
                                ]}
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Rate Card Category *</label>
                            <Select
                                value={formData.rateCardCategory}
                                onChange={(e) => handleInputChange('rateCardCategory', e.target.value)}
                                options={[
                                    { label: 'Select Category', value: '' },
                                    ...categories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))
                                ]}
                            />
                        </div>

                        {/* Shipment Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Shipment Type *</label>
                            <Select
                                value={formData.shipmentType}
                                onChange={(e) => handleInputChange('shipmentType', e.target.value)}
                                options={shipmentTypes.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))}
                            />
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
                            <Select
                                value={formData.minimumFareCalculatedOn}
                                onChange={(e) => handleInputChange('minimumFareCalculatedOn', e.target.value)}
                                options={[
                                    { label: 'Freight', value: 'freight' },
                                    { label: 'Freight + Overhead', value: 'freight_overhead' }
                                ]}
                            />
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
                            <Select
                                value={formData.status}
                                onChange={(e) => handleInputChange('status', e.target.value)}
                                options={[
                                    { label: 'Active', value: 'active' },
                                    { label: 'Inactive', value: 'inactive' }
                                ]}
                            />
                        </div>
                    </div>
                    {/* Zone Mapping & Weight Constraints */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Zone B Mapping *</label>
                            <Select
                                value={formData.zoneBType}
                                onChange={(e) => handleInputChange('zoneBType', e.target.value)}
                                options={zoneMappings.map(z => ({ label: z.charAt(0).toUpperCase() + z.slice(1), value: z }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Weight Constraint?</label>
                            <Select
                                value={formData.isWeightConstraint ? 'yes' : 'no'}
                                onChange={(e) => handleInputChange('isWeightConstraint', e.target.value === 'yes')}
                                options={[
                                    { label: 'No', value: 'no' },
                                    { label: 'Yes', value: 'yes' }
                                ]}
                            />
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

            {/* Zone Pricing Cards - Reusing structure */}
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
                    <Button variant="ghost" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                </Link>
                <Button
                    onClick={handleSubmit}
                    disabled={isUpdating}
                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/20"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdating ? 'Updating...' : 'Update Rate Card'}
                </Button>
            </div>
        </div>
    );
}
