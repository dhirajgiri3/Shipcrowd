"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/core/Card';
import { Button } from '@/components/ui/core/Button';
import { Input } from '@/components/ui/core/Input';
import { Badge } from '@/components/ui/core/Badge';
import {
    Calculator,
    Package,
    MapPin,
    Truck,
    IndianRupee,
    Scale,
    Box,
    ArrowRight,
    Clock,
    Building2,
    Zap,
    CheckCircle
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/shared/utils';

// Mock B2B rate results
const mockB2BRates = [
    {
        courier: 'Delhivery',
        service: 'B2B Surface',
        baseRate: 250,
        perKg: 15,
        total: 670,
        eta: '5-7 days',
        features: ['Bulk Handling', 'POD Included']
    },
    {
        courier: 'Bluedart',
        service: 'B2B Air',
        baseRate: 350,
        perKg: 22,
        total: 966,
        eta: '2-3 days',
        features: ['Priority Handling', 'Insurance Included']
    },
    {
        courier: 'DTDC',
        service: 'B2B Economy',
        baseRate: 180,
        perKg: 12,
        total: 516,
        eta: '7-10 days',
        features: ['Bulk Discount']
    },
    {
        courier: 'Xpressbees',
        service: 'B2B Standard',
        baseRate: 220,
        perKg: 14,
        total: 612,
        eta: '4-6 days',
        features: ['GST Invoice', 'Tracking']
    },
];

export function B2bRatesClient() {
    const [fromPincode, setFromPincode] = useState('');
    const [toPincode, setToPincode] = useState('');
    const [weight, setWeight] = useState('');
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [shipmentType, setShipmentType] = useState<'single' | 'bulk'>('single');
    const [quantity, setQuantity] = useState('1');
    const [showResults, setShowResults] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    const calculateVolumetricWeight = () => {
        const l = Number(length) || 0;
        const w = Number(width) || 0;
        const h = Number(height) || 0;
        return (l * w * h) / 5000;
    };

    const handleCalculate = () => {
        if (!fromPincode || !toPincode || !weight) {
            addToast('Please fill in all required fields', 'warning');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setShowResults(true);
        }, 1000);
    };

    const handleBookNow = (courier: string) => {
        addToast(`Redirecting to book with ${courier}...`, 'info');
    };

    const volumetricWeight = calculateVolumetricWeight();
    const actualWeight = Number(weight) || 0;
    const chargeableWeight = Math.max(volumetricWeight, actualWeight);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Calculator className="h-6 w-6 text-[var(--primary-blue)]" />
                        B2B Rate Calculator
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Get competitive B2B shipping rates for bulk and heavy shipments
                    </p>
                </div>
                <Badge variant="outline" className="gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Business Shipping
                </Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Calculator Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Shipment Type */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Shipment Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShipmentType('single')}
                                    className={cn(
                                        "flex-1 p-4 rounded-xl border-2 transition-all",
                                        shipmentType === 'single'
                                            ? "border-[var(--primary-blue)] bg-[var(--primary-blue)]/5"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <Package className={cn(
                                        "h-8 w-8 mx-auto mb-2",
                                        shipmentType === 'single' ? "text-[var(--primary-blue)]" : "text-[var(--text-muted)]"
                                    )} />
                                    <p className="font-semibold text-[var(--text-primary)]">Single Shipment</p>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">One heavy package</p>
                                </button>
                                <button
                                    onClick={() => setShipmentType('bulk')}
                                    className={cn(
                                        "flex-1 p-4 rounded-xl border-2 transition-all",
                                        shipmentType === 'bulk'
                                            ? "border-[var(--primary-blue)] bg-[var(--primary-blue)]/5"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <Box className={cn(
                                        "h-8 w-8 mx-auto mb-2",
                                        shipmentType === 'bulk' ? "text-[var(--primary-blue)]" : "text-[var(--text-muted)]"
                                    )} />
                                    <p className="font-semibold text-[var(--text-primary)]">Bulk Shipment</p>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">Multiple packages</p>
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pincodes */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-[var(--primary-blue)]" />
                                Pickup & Delivery Location
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">From Pincode *</label>
                                    <Input
                                        placeholder="e.g., 400001"
                                        value={fromPincode}
                                        onChange={(e) => setFromPincode(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">To Pincode *</label>
                                    <Input
                                        placeholder="e.g., 110001"
                                        value={toPincode}
                                        onChange={(e) => setToPincode(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Package Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Scale className="h-5 w-5 text-[var(--primary-blue)]" />
                                Package Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Weight (kg) *</label>
                                    <Input
                                        type="number"
                                        placeholder="e.g., 28"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                    />
                                </div>
                                {shipmentType === 'bulk' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">Quantity</label>
                                        <Input
                                            type="number"
                                            placeholder="e.g., 10"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Length (cm)</label>
                                    <Input
                                        type="number"
                                        placeholder="L"
                                        value={length}
                                        onChange={(e) => setLength(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Width (cm)</label>
                                    <Input
                                        type="number"
                                        placeholder="W"
                                        value={width}
                                        onChange={(e) => setWidth(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Height (cm)</label>
                                    <Input
                                        type="number"
                                        placeholder="H"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button className="w-full h-12" onClick={handleCalculate} isLoading={isLoading}>
                        <Calculator className="h-4 w-4 mr-2" />
                        Calculate Rates
                    </Button>
                </div>

                {/* Weight Summary */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-lg">Weight Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Actual Weight</span>
                                    <span className="font-medium">{actualWeight.toFixed(2)} kg</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Volumetric Weight</span>
                                    <span className="font-medium">{volumetricWeight.toFixed(2)} kg</span>
                                </div>
                                {shipmentType === 'bulk' && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-[var(--text-muted)]">Quantity</span>
                                        <span className="font-medium">{quantity} units</span>
                                    </div>
                                )}
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Chargeable Weight</span>
                                    <span className="text-[var(--primary-blue)]">{chargeableWeight.toFixed(2)} kg</span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Higher of actual or volumetric weight
                                </p>
                            </div>

                            {shipmentType === 'bulk' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                                    <p className="font-medium text-[var(--warning)]">Bulk Discount Applied</p>
                                    <p className="text-[var(--warning)] text-xs mt-1">10% off on 10+ units</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Results */}
            {showResults && (
                <Card className="mt-6 animate-in fade-in duration-300">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Truck className="h-5 w-5 text-[var(--primary-blue)]" />
                            Available B2B Rates
                        </CardTitle>
                        <CardDescription>
                            {fromPincode} → {toPincode} • {chargeableWeight.toFixed(2)} kg
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            {mockB2BRates.map((rate, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "p-4 rounded-xl border transition-all",
                                        index === 0
                                            ? "border-[var(--success)] bg-[var(--success-bg)]/50"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    {index === 0 && (
                                        <Badge variant="success" className="mb-3">
                                            <Zap className="h-3 w-3 mr-1" />
                                            Best Value
                                        </Badge>
                                    )}
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-[var(--text-primary)]">{rate.courier}</h4>
                                            <p className="text-sm text-[var(--text-muted)]">{rate.service}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(rate.total)}</p>
                                            <p className="text-xs text-[var(--text-muted)]">+ GST</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mb-3 text-sm text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {rate.eta}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <IndianRupee className="h-3.5 w-3.5" />
                                            ₹{rate.perKg}/kg after base
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {rate.features.map((f, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                {f}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Button
                                        className="w-full"
                                        variant={index === 0 ? 'primary' : 'outline'}
                                        onClick={() => handleBookNow(rate.courier)}
                                    >
                                        Book Now
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
