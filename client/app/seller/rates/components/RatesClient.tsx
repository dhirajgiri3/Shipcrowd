"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Calculator,
    TrendingUp,
    Zap,
    Star,
    Trophy,
    Clock,
    IndianRupee,
    Package,
    MapPin,
    Weight,
    Settings2,
    ChevronDown,
    ChevronUp,
    Info,
    Truck
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
    useSmartRateCalculator,
    getMedalIcon,
    getMedalColor,
    getScoreColor
} from '@/src/core/api/hooks/logistics/useSmartRateCalculator';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { SmartRateInput, CourierRateOption, ratesApi } from '@/src/core/api/clients/shipping/ratesApi';

export function RatesClient() {
    const { addToast } = useToast();
    const calculateSmartRates = useSmartRateCalculator();

    const [formData, setFormData] = useState<SmartRateInput>({
        originPincode: '560001',
        destinationPincode: '110001',
        weight: 0.5,
        paymentMode: 'prepaid',
        orderValue: 1000,
        dimensions: {
            length: 10,
            width: 10,
            height: 10,
        },
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [customWeights, setCustomWeights] = useState({
        price: 40,
        speed: 30,
        reliability: 15,
        performance: 15,
    });

    const [results, setResults] = useState<CourierRateOption[] | null>(null);
    const [recommendation, setRecommendation] = useState<string | null>(null);
    const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);

    const handleCalculate = async () => {
        // Validation
        if (!formData.originPincode || formData.originPincode.length !== 6) {
            addToast('Please enter a valid 6-digit origin pincode', 'error');
            return;
        }
        if (!formData.destinationPincode || formData.destinationPincode.length !== 6) {
            addToast('Please enter a valid 6-digit destination pincode', 'error');
            return;
        }
        if (formData.weight <= 0) {
            addToast('Weight must be greater than 0', 'error');
            return;
        }

        // Serviceability check
        try {
            const [originCheck, destCheck] = await Promise.all([
                ratesApi.checkServiceability(formData.originPincode),
                ratesApi.checkServiceability(formData.destinationPincode),
            ]);

            if (!originCheck.serviceable) {
                addToast(`Origin pincode ${formData.originPincode} is not serviceable`, 'error');
                return;
            }
            if (!destCheck.serviceable) {
                addToast(`Destination pincode ${formData.destinationPincode} is not serviceable`, 'error');
                return;
            }
        } catch (error) {
            // Non-blocking: proceed with rate calculation even if serviceability check fails
            console.warn('Serviceability check failed, proceeding with rate calculation:', error);
        }

        try {
            const response = await calculateSmartRates.mutateAsync({
                ...formData,
                scoringWeights: showAdvanced ? customWeights : undefined,
            });

            setResults(response.rates);
            setRecommendation(response.recommendation);
            addToast(`Found ${response.totalOptions} courier options`, 'success');
        } catch (error) {
            console.error('Smart rate calculation failed:', error);
        }
    };

    const handleWeightChange = (field: keyof typeof customWeights, value: number) => {
        setCustomWeights((prev) => ({ ...prev, [field]: value }));
    };

    const totalWeight = customWeights.price + customWeights.speed + customWeights.reliability + customWeights.performance;
    const isWeightValid = totalWeight === 100;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-purple)] flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Smart Rate Calculator</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        AI-powered courier recommendations with intelligent scoring
                    </p>
                </div>
            </div>

            {/* Input Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-[var(--primary-blue)]" />
                        Shipment Details
                    </CardTitle>
                    <CardDescription>Enter your shipment information to get smart recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Pincodes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                Origin Pincode
                            </label>
                            <Input
                                placeholder="Origin Pincode"
                                maxLength={6}
                                value={formData.originPincode}
                                onChange={(e) => setFormData({ ...formData, originPincode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                Destination Pincode
                            </label>
                            <Input
                                placeholder="Destination Pincode"
                                maxLength={6}
                                value={formData.destinationPincode}
                                onChange={(e) => setFormData({ ...formData, destinationPincode: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Weight & Payment Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                <Weight className="h-4 w-4" />
                                Weight (kg)
                            </label>
                            <Input
                                type="number"
                                step="0.1"
                                min="0.01"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Payment Mode</label>
                            <select
                                className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                                value={formData.paymentMode}
                                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as 'prepaid' | 'cod' })}
                            >
                                <option value="prepaid">Prepaid</option>
                                <option value="cod">Cash on Delivery</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                <IndianRupee className="h-4 w-4" />
                                Order Value
                            </label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.orderValue}
                                onChange={(e) => setFormData({ ...formData, orderValue: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    {/* Dimensions (Optional) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                            Package Dimensions (Optional)
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-[var(--text-secondary)]">Length (cm)</label>
                                <Input
                                    type="number"
                                    placeholder="L"
                                    min="1"
                                    value={formData.dimensions?.length || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        dimensions: {
                                            ...formData.dimensions!,
                                            length: parseFloat(e.target.value) || 10
                                        }
                                    })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-[var(--text-secondary)]">Width (cm)</label>
                                <Input
                                    type="number"
                                    placeholder="W"
                                    min="1"
                                    value={formData.dimensions?.width || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        dimensions: {
                                            ...formData.dimensions!,
                                            width: parseFloat(e.target.value) || 10
                                        }
                                    })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-[var(--text-secondary)]">Height (cm)</label>
                                <Input
                                    type="number"
                                    placeholder="H"
                                    min="1"
                                    value={formData.dimensions?.height || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        dimensions: {
                                            ...formData.dimensions!,
                                            height: parseFloat(e.target.value) || 10
                                        }
                                    })}
                                />
                            </div>
                        </div>
                        {formData.dimensions && (
                            <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-2 rounded">
                                <span>Volumetric Weight: {((formData.dimensions.length * formData.dimensions.width * formData.dimensions.height) / 5000).toFixed(3)} kg</span>
                                <span className="mx-2">•</span>
                                <span>Chargeable Weight: {Math.max(formData.weight, (formData.dimensions.length * formData.dimensions.width * formData.dimensions.height) / 5000).toFixed(3)} kg</span>
                            </div>
                        )}
                    </div>

                    {/* Advanced Settings */}
                    <div className="border-t border-[var(--border-subtle)] pt-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue)]/80"
                        >
                            <Settings2 className="h-4 w-4" />
                            Advanced Scoring Weights
                            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 space-y-4 p-4 rounded-lg bg-[var(--bg-secondary)]">
                                <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <p>Customize how couriers are scored. Total must equal 100%.</p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(customWeights).map(([key, value]) => (
                                        <div key={key} className="space-y-2">
                                            <label className="text-xs font-medium text-[var(--text-primary)] capitalize">
                                                {key}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={value}
                                                    onChange={(e) => handleWeightChange(key as keyof typeof customWeights, parseInt(e.target.value) || 0)}
                                                />
                                                <span className="text-sm text-[var(--text-secondary)]">%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={cn(
                                    "text-sm font-medium",
                                    isWeightValid ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    Total: {totalWeight}% {isWeightValid ? '✓' : '✗ Must equal 100%'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Calculate Button */}
                    <Button
                        onClick={handleCalculate}
                        disabled={calculateSmartRates.isPending || (showAdvanced && !isWeightValid)}
                        className="w-full"
                        size="lg"
                    >
                        {calculateSmartRates.isPending ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Calculating...
                            </>
                        ) : (
                            <>
                                <Calculator className="h-4 w-4 mr-2" />
                                Calculate Smart Rates
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {results && results.length > 0 && (
                <div className="space-y-4">
                    {/* Recommendation Banner */}
                    {recommendation && (
                        <Card className="border-2 border-[var(--primary-blue)]">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-purple)] flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-[var(--text-secondary)]">Our Recommendation</p>
                                    <p className="text-lg font-bold text-[var(--text-primary)]">{recommendation}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Rate Options */}
                    <div className="space-y-3">
                        {results.map((rate) => (
                            <Card
                                key={`${rate.courierId}-${rate.serviceType}`}
                                className={cn(
                                    "transition-all hover:shadow-md",
                                    rate.tags.includes('RECOMMENDED') && "border-2 border-[var(--primary-blue)]"
                                )}
                            >
                                <CardContent className="p-5">
                                    <div className="space-y-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center">
                                                    <Truck className="h-5 w-5 text-[var(--primary-blue)]" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-[var(--text-primary)]">
                                                        {rate.courierName}
                                                    </h3>
                                                    <p className="text-sm text-[var(--text-secondary)] capitalize">
                                                        {rate.serviceType}
                                                    </p>
                                                    {/* Pricing Resolution Badge */}
                                                    {rate.pricingResolution && (
                                                        <div className="mt-1">
                                                            {(() => {
                                                                const res = rate.pricingResolution;
                                                                let variant: 'success' | 'warning' | 'neutral' = 'neutral';
                                                                let label = 'Generic Rule';

                                                                if (res.matchType === 'EXACT') {
                                                                    variant = 'success';
                                                                    label = 'Exact Rate';
                                                                } else if (res.matchType === 'CARRIER_DEFAULT') {
                                                                    variant = 'warning';
                                                                    label = 'Carrier Default';
                                                                }

                                                                return (
                                                                    <Badge variant={variant} className="text-[10px] h-5 px-1.5 font-normal">
                                                                        {label}
                                                                    </Badge>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                                    ₹{rate.totalAmount.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-[var(--text-secondary)]">
                                                    Inc. GST
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tags */}
                                        {rate.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {rate.tags.map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        className={cn("text-xs", getMedalColor(tag))}
                                                    >
                                                        {getMedalIcon(tag)} {tag.replace('_', ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Delivery & Performance */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
                                                <div>
                                                    <p className="text-[var(--text-secondary)]">Delivery</p>
                                                    <p className="font-medium text-[var(--text-primary)]">
                                                        {rate.estimatedDeliveryDays} days
                                                    </p>
                                                </div>
                                            </div>
                                            {rate.zone && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-[var(--text-secondary)]" />
                                                    <div>
                                                        <p className="text-[var(--text-secondary)]">Zone</p>
                                                        <p className="font-medium text-[var(--text-primary)]">
                                                            {rate.zone.replace('zone', 'Zone ').toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {rate.rating > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Star className="h-4 w-4 text-amber-500" />
                                                    <div>
                                                        <p className="text-[var(--text-secondary)]">Rating</p>
                                                        <p className="font-medium text-[var(--text-primary)]">
                                                            {rate.rating.toFixed(1)}/5
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {rate.deliverySuccessRate > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                                    <div>
                                                        <p className="text-[var(--text-secondary)]">Success Rate</p>
                                                        <p className="font-medium text-[var(--text-primary)]">
                                                            {rate.deliverySuccessRate.toFixed(0)}%
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {rate.onTimeDeliveryRate > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Zap className="h-4 w-4 text-blue-500" />
                                                    <div>
                                                        <p className="text-[var(--text-secondary)]">On-Time</p>
                                                        <p className="font-medium text-[var(--text-primary)]">
                                                            {rate.onTimeDeliveryRate.toFixed(0)}%
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Scores */}
                                        {rate.scores.overallScore > 0 && (
                                            <div className="border-t border-[var(--border-subtle)] pt-3">
                                                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                                                    Performance Scores
                                                </p>
                                                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                                    {Object.entries(rate.scores).map(([key, value]) => (
                                                        <div key={key}>
                                                            <p className="text-[var(--text-secondary)] capitalize mb-1">
                                                                {key.replace('Score', '')}
                                                            </p>
                                                            <p className={cn("font-bold", getScoreColor(value))}>
                                                                {Math.round(value)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Pricing Breakdown */}
                                        <div className="border-t border-[var(--border-subtle)] pt-3">
                                            <button
                                                onClick={() => setExpandedBreakdown(
                                                    expandedBreakdown === rate.courierId ? null : rate.courierId
                                                )}
                                                className="flex items-center gap-2 text-xs font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue)]/80"
                                            >
                                                View Pricing Breakdown
                                                {expandedBreakdown === rate.courierId ? (
                                                    <ChevronUp className="h-3 w-3" />
                                                ) : (
                                                    <ChevronDown className="h-3 w-3" />
                                                )}
                                            </button>

                                            {expandedBreakdown === rate.courierId && (
                                                <div className="mt-3 space-y-1.5 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-[var(--text-secondary)]">Base Rate</span>
                                                        <span className="font-medium">₹{rate.baseRate.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-[var(--text-secondary)]">Weight Charge</span>
                                                        <span className="font-medium">₹{rate.weightCharge.toFixed(2)}</span>
                                                    </div>
                                                    {rate.codCharge > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-[var(--text-secondary)]">COD Charge</span>
                                                            <span className="font-medium">₹{rate.codCharge.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {rate.fuelCharge > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-[var(--text-secondary)]">Fuel Surcharge</span>
                                                            <span className="font-medium">₹{rate.fuelCharge.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {rate.rtoCharge > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-[var(--text-secondary)]">RTO Charge</span>
                                                            <span className="font-medium">₹{rate.rtoCharge.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="text-[var(--text-secondary)]">GST</span>
                                                        <span className="font-medium">₹{rate.gstAmount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-1.5 border-t border-[var(--border-subtle)] font-semibold">
                                                        <span>Total Amount</span>
                                                        <span>₹{rate.totalAmount.toFixed(2)}</span>
                                                    </div>
                                                    {rate.chargeableWeight > 0 && (
                                                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] pt-1">
                                                            <span>Chargeable Weight</span>
                                                            <span>{rate.chargeableWeight.toFixed(3)} kg</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* No Results */}
            {results && results.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-[var(--text-secondary)]">
                            No courier options available for this route
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
