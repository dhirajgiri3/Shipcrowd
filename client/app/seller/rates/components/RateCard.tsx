"use client";

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Truck,
    Clock,
    MapPin,
    Star,
    TrendingUp,
    Zap,
    ChevronDown,
    ChevronUp,
    Award,
    IndianRupee,
    Timer,
    Info
} from 'lucide-react';
import { CourierRateOption } from '@/src/core/api/clients/shipping/ratesApi';
import { cn } from '@/src/lib/utils';
import {
    getMedalColor,
    getScoreColor
} from '@/src/core/api/hooks/logistics/useSmartRateCalculator';

interface RateCardProps {
    rate: CourierRateOption;
    isExpanded: boolean;
    onToggle: () => void;
}

export function RateCard({ rate, isExpanded, onToggle }: RateCardProps) {

    const getBadgeIcon = (tag: string) => {
        switch (tag) {
            case 'RECOMMENDED': return <Award className="h-3 w-3 mr-1" />;
            case 'CHEAPEST': return <IndianRupee className="h-3 w-3 mr-1" />;
            case 'FASTEST': return <Timer className="h-3 w-3 mr-1" />;
            case 'BEST_RATED': return <Star className="h-3 w-3 mr-1" />;
            default: return null;
        }
    };

    return (
        <Card
            className={cn(
                "transition-all hover:shadow-sm border-[var(--border-subtle)]",
                rate.tags.includes('RECOMMENDED') && "border-[var(--primary-blue)] ring-1 ring-[var(--primary-blue)]/10"
            )}
        >
            <CardContent className="p-5">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-subtle)]">
                                <Truck className="h-5 w-5 text-[var(--text-secondary)]" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text-primary)]">
                                    {rate.courierName}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-[var(--text-secondary)] capitalize">
                                        {rate.serviceType}
                                    </p>
                                    {/* Pricing Resolution Badge */}
                                    {rate.pricingResolution && (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-2xl font-bold text-[var(--text-primary)]">
                                    ₹{rate.totalAmount.toFixed(2)}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Inc. GST
                            </p>
                        </div>
                    </div>

                    {/* Tags - Premium Flat Design */}
                    {rate.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {rate.tags.map((tag) => (
                                <Badge
                                    key={tag}
                                    className={cn("text-xs font-medium border-0 px-2 py-0.5", getMedalColor(tag))}
                                >
                                    {getBadgeIcon(tag)} {tag.replace('_', ' ')}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Delivery & Performance Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-[var(--border-subtle)] pt-4 mt-2">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
                            <div>
                                <p className="text-[var(--text-secondary)] text-xs">Delivery</p>
                                <p className="font-medium text-[var(--text-primary)]">
                                    {rate.estimatedDeliveryDays} days
                                </p>
                            </div>
                        </div>
                        {rate.zone && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-[var(--text-secondary)]" />
                                <div>
                                    <p className="text-[var(--text-secondary)] text-xs">Zone</p>
                                    <p className="font-medium text-[var(--text-primary)]">
                                        {rate.zone.replace('zone', 'Zone ').toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        )}
                        {rate.rating > 0 && (
                            <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                <div>
                                    <p className="text-[var(--text-secondary)] text-xs">Rating</p>
                                    <p className="font-medium text-[var(--text-primary)]">
                                        {rate.rating.toFixed(1)}/5
                                    </p>
                                </div>
                            </div>
                        )}
                        {rate.deliverySuccessRate > 0 && (
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <div>
                                    <p className="text-[var(--text-secondary)] text-xs">Success Rate</p>
                                    <p className="font-medium text-[var(--text-primary)]">
                                        {rate.deliverySuccessRate.toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Performance Scores - Flat Cards */}
                    {rate.scores.overallScore > 0 && (
                        <div className="pt-2">
                            <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                {Object.entries(rate.scores).map(([key, value]) => (
                                    <div key={key} className="bg-[var(--bg-secondary)] rounded-md py-1.5 border border-[var(--border-subtle)]/50">
                                        <p className="text-[var(--text-secondary)] capitalize mb-0.5 text-[10px]">
                                            {key.replace('Score', '')}
                                        </p>
                                        <p className={cn("font-bold text-sm", getScoreColor(value))}>
                                            {Math.round(value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pricing Breakdown Accordion */}
                    <div className="border-t border-[var(--border-subtle)] pt-3">
                        <button
                            onClick={onToggle}
                            className="flex items-center gap-2 text-xs font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] transition-colors"
                        >
                            View Pricing Breakdown
                            {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                            ) : (
                                <ChevronDown className="h-3 w-3" />
                            )}
                        </button>

                        {isExpanded && (
                            <div className="mt-3 space-y-2 text-xs bg-[var(--bg-secondary)]/50 p-3 rounded-lg border border-[var(--border-subtle)]/50">
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-secondary)]">Base Rate</span>
                                    <span className="font-medium">₹{rate.baseRate.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[var(--text-secondary)]">Weight Charge</span>
                                        {rate.weightCharge === 0 && (
                                            <div className="group relative">
                                                <Info className="h-3 w-3 text-[var(--text-muted)] cursor-help" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg hidden group-hover:block z-10">
                                                    Weight fits within base slab. No extra charge.
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
                                <div className="flex justify-between pt-2 border-t border-[var(--border-subtle)] font-bold text-[var(--text-primary)]">
                                    <span>Total Amount</span>
                                    <span>₹{rate.totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-[var(--text-muted)] pt-1">
                                    <span>Chargeable Weight</span>
                                    <span>{rate.chargeableWeight.toFixed(3)} kg</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
