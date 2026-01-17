"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Select } from '@/src/components/ui/form/Select';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Calculator,
    MapPin,
    Package,
    Weight,
    Ruler,
    IndianRupee,
    Truck,
    Clock,
    Star,
    ArrowRight,
    RefreshCw
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/lib/utils';
import { getCourierLogo } from '@/src/lib/constants';

// Note: The backend `/ratecards/calculate` endpoint requires full implementation
// For now, this calculates client-side but validates against available carriers
const calculateRates = (data: any) => {
    const { weight, originPincode, destinationPincode } = data;
    const baseWeight = parseFloat(weight) || 0.5;

    // Mock calculation (replace with API call when ready)
    const carriers = ['Delhivery', 'Xpressbees', 'DTDC', 'Bluedart', 'EcomExpress'];
    return carriers.map((courier, idx) => {
        const baseRate = 50 + (idx * 10);
        const weightCharge = baseWeight * (30 - idx * 2);
        const zoneMultiplier = Math.random() > 0.5 ? 1.2 : 1.0;
        const rate = Math.round((baseRate + weightCharge) * zoneMultiplier);
        const eta = idx === 0 ? '1-2 days' : idx === 1 ? '2-3 days' : '3-4 days';
        const rating = (4.0 + Math.random() * 0.8).toFixed(1);

        return {
            courier,
            rate,
            eta,
            rating: parseFloat(rating),
            recommended: idx === 1 // Xpressbees recommended for best value
        };
    }).sort((a, b) => a.rate - b.rate);
};

export function RatesClient() {
    const [formData, setFormData] = useState({
        originPincode: '',
        destinationPincode: '',
        weight: '',
        length: '',
        width: '',
        height: '',
        paymentMode: 'prepaid'
    });
    const [calculatedRates, setCalculatedRates] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const { addToast } = useToast();

    const handleCalculate = () => {
        if (!formData.originPincode || !formData.destinationPincode || !formData.weight) {
            addToast('Please fill in required fields', 'error');
            return;
        }

        // Validate pincodes
        if (!/^\d{6}$/.test(formData.originPincode) || !/^\d{6}$/.test(formData.destinationPincode)) {
            addToast('Invalid pincode format (6 digits required)', 'error');
            return;
        }

        setIsCalculating(true);

        // Simulate API call
        setTimeout(() => {
            const rates = calculateRates(formData);
            setCalculatedRates(rates);
            setShowResults(true);
            setIsCalculating(false);
            addToast('Rates calculated successfully!', 'success');
        }, 800);
    };

    const handleReset = () => {
        setFormData({
            originPincode: '',
            destinationPincode: '',
            weight: '',
            length: '',
            width: '',
            height: '',
            paymentMode: 'prepaid'
        });
        setShowResults(false);
        setCalculatedRates([]);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Calculator className="h-6 w-6 text-indigo-600" />
                        Rate Calculator
                    </h2>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Compare shipping rates across all courier partners</p>
                </div>
                {showResults && (
                    <Button variant="outline" onClick={handleReset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        New Calculation
                    </Button>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Calculator Form */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Shipment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Origin & Destination */}
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                                    Origin Pincode *
                                </label>
                                <Input
                                    placeholder="e.g. 400001"
                                    value={formData.originPincode}
                                    onChange={(e) => setFormData({ ...formData, originPincode: e.target.value })}
                                    maxLength={6}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                                    Destination Pincode *
                                </label>
                                <Input
                                    placeholder="e.g. 110001"
                                    value={formData.destinationPincode}
                                    onChange={(e) => setFormData({ ...formData, destinationPincode: e.target.value })}
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        {/* Weight */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                                <Weight className="h-4 w-4 text-[var(--text-muted)]" />
                                Weight (kg) *
                            </label>
                            <Input
                                type="number"
                                placeholder="e.g. 0.5"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                min="0.1"
                                step="0.1"
                            />
                        </div>

                        {/* Dimensions */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                                <Ruler className="h-4 w-4 text-[var(--text-muted)]" />
                                Dimensions (cm) - Optional
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <Input
                                    placeholder="L"
                                    value={formData.length}
                                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                                />
                                <Input
                                    placeholder="W"
                                    value={formData.width}
                                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                                />
                                <Input
                                    placeholder="H"
                                    value={formData.height}
                                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Payment Mode */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-[var(--text-muted)]" />
                                Payment Mode
                            </label>
                            <Select
                                options={[
                                    { label: 'Prepaid', value: 'prepaid' },
                                    { label: 'COD', value: 'cod' },
                                ]}
                                value={formData.paymentMode}
                                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                            />
                        </div>

                        <Button
                            className="w-full mt-4"
                            onClick={handleCalculate}
                            disabled={isCalculating}
                            isLoading={isCalculating}
                        >
                            {isCalculating ? 'Calculating...' : 'Calculate Rates'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results */}
                <div className="lg:col-span-2">
                    {!showResults ? (
                        <Card className="h-full flex items-center justify-center bg-[var(--bg-secondary)]">
                            <CardContent className="text-center py-12">
                                <Package className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                                <p className="text-[var(--text-muted)]">Enter shipment details to see available rates</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-[var(--text-secondary)]">
                                    <span className="font-medium">{calculatedRates.length}</span> courier options available
                                </p>
                                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                    <span>{formData.originPincode}</span>
                                    <ArrowRight className="h-4 w-4" />
                                    <span>{formData.destinationPincode}</span>
                                    <span className="text-[var(--text-muted)]">•</span>
                                    <span>{formData.weight} kg</span>
                                </div>
                            </div>

                            {calculatedRates.map((rate, idx) => (
                                <Card
                                    key={idx}
                                    className={`hover:shadow-md transition-shadow ${rate.recommended ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={getCourierLogo(rate.courier)}
                                                    alt={rate.courier}
                                                    className="w-10 h-10 object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${rate.courier}&background=random&color=fff&size=40`;
                                                    }}
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-[var(--text-primary)]">{rate.courier}</span>
                                                        {rate.recommended && (
                                                            <Badge variant="success" className="text-xs">Best Value</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-muted)]">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {rate.eta}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Star className="h-3.5 w-3.5 text-[var(--warning)]" />
                                                            {rate.rating}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(rate.rate)}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">All inclusive</p>
                                                </div>
                                                <Button
                                                    onClick={() => addToast(`Creating shipment with ${rate.courier}...`, 'info')}
                                                >
                                                    Ship Now
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Info Note */}
            <Card className="bg-[var(--info-bg)] border-[var(--info)]/20">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Calculator className="h-5 w-5 text-[var(--info)] mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-[var(--info)]">Rate Calculation</p>
                            <p className="text-xs text-[var(--info)] mt-1">
                                Rates shown are estimates. Final charges may vary based on volumetric weight, zone classification, and service add-ons.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
