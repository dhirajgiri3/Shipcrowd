"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Calculator,
    Package,
    MapPin,
    Truck,
    Scale,
    Box,
    ArrowRight,
    Clock,
    Building2,
    Zap,
    CheckCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/lib/utils';
import { TruckLoader } from '@/src/components/ui';
import { useCalculateRates } from '@/src/core/api/hooks/seller/useSellerRates';
import type { RateCalculationPayload } from '@/src/core/api/hooks/seller/useSellerRates';
import type { CourierRate } from '@/src/types/domain/order';

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
    const [calculatedRates, setCalculatedRates] = useState<CourierRate[]>([]);

    const { addToast } = useToast();
    const { mutate: calculateRates, isPending: isLoading } = useCalculateRates();

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

        const payload: RateCalculationPayload = {
            originPincode: fromPincode,
            destinationPincode: toPincode,
            weight: Number(weight),
            length: Number(length),
            width: Number(width),
            height: Number(height),
            isB2B: true,
            quantity: shipmentType === 'bulk' ? Number(quantity) : 1
        };

        calculateRates(payload, {
            onSuccess: (data) => {
                setCalculatedRates(data.data);
                setShowResults(true);
                addToast('Rates calculated successfully', 'success');
            },
            onError: (error: any) => {
                addToast(error?.response?.data?.message || 'Failed to calculate rates', 'error');
            }
        });
    };

    const handleBookNow = (courierName: string) => {
        addToast(`Redirecting to book with ${courierName}...`, 'info');
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
                                            : "border-[var(--border-default)] hover:border-[var(--border-hover)]"
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
                                            : "border-[var(--border-default)] hover:border-[var(--border-hover)]"
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
                                        maxLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">To Pincode *</label>
                                    <Input
                                        placeholder="e.g., 110001"
                                        value={toPincode}
                                        onChange={(e) => setToPincode(e.target.value)}
                                        maxLength={6}
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

                    <Button className="w-full h-12" onClick={handleCalculate} isLoading={isLoading} disabled={isLoading}>
                        <Calculator className="h-4 w-4 mr-2" />
                        {isLoading ? 'Calculating Best Rates...' : 'Calculate B2B Rates'}
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
                                <div className="bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-lg p-3 text-sm">
                                    <p className="font-medium text-[var(--warning)]">Bulk Discount Applied</p>
                                    <p className="text-[var(--warning)] text-xs mt-1">10% off on 10+ units if applicable</p>
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
                        {calculatedRates.length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                No rates found for this route. Please try checking pincodes.
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {calculatedRates.map((rate, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all",
                                            rate.isRecommended
                                                ? "border-[var(--success)] bg-[var(--success-bg)]/50"
                                                : "border-[var(--border-default)] hover:border-[var(--border-hover)]"
                                        )}
                                    >
                                        {rate.isRecommended && (
                                            <Badge variant="success" className="mb-3">
                                                <Zap className="h-3 w-3 mr-1" />
                                                Best Value
                                            </Badge>
                                        )}
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-semibold text-[var(--text-primary)]">{rate.courierName}</h4>
                                                <p className="text-sm text-[var(--text-muted)]">{rate.serviceType}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(rate.rate)}</p>
                                                <p className="text-xs text-[var(--text-muted)]">+ GST ({formatCurrency(rate.sellBreakdown?.gst || 0)})</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mb-3 text-sm text-[var(--text-muted)]">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {(rate.estimatedDeliveryDays || 0)} days
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {(rate.tags || []).map((f, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    {f}
                                                </Badge>
                                            ))}
                                        </div>
                                        <Button
                                            className="w-full"
                                            variant={rate.isRecommended ? 'primary' : 'outline'}
                                            onClick={() => handleBookNow(rate.courierName)}
                                        >
                                            Book Now
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            {/* Truck Loader Overlay */}
            {isLoading && (
                <TruckLoader
                    message="Fetching best B2B rates..."
                    subMessage="Analyzing carrier network"
                    fullScreen={true}
                />
            )}
        </div>
    );
}
