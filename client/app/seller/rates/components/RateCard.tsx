"use client";

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Button } from '@/src/components/ui/core/Button';
import {
    Truck,
    Clock,
    MapPin,
    Star,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Award,
    IndianRupee,
    Timer,
    Info,
    CheckCircle2,
    ShieldCheck
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

    const handleBookNow = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('Book Now clicked for:', rate.courierName);
        // Future: Implement booking logic
    };

    return (
        <Card
            className={cn(
                "transition-all duration-300 hover:shadow-md border-[var(--border-subtle)] group",
                rate.tags.includes('RECOMMENDED') && "border-[var(--primary-blue)] ring-1 ring-[var(--primary-blue)]/10 bg-[var(--primary-blue-soft)]/5"
            )}
        >
            <CardContent className="p-0">
                <div className="p-5 space-y-4">
                    {/* Header Row: Courier Info & Price */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-subtle)] shadow-sm group-hover:border-[var(--primary-blue)]/30 transition-colors">
                                <Truck className="h-6 w-6 text-[var(--text-secondary)] group-hover:text-[var(--primary-blue)] transition-colors" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                                    {rate.courierName}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                                        {rate.serviceType}
                                    </span>
                                    {/* Pricing Resolution Badge */}
                                    {rate.pricingResolution && rate.pricingResolution.matchType === 'EXACT' && (
                                        <Badge variant="success" className="text-[10px] h-4 px-1 font-normal bg-green-100 text-green-700 hover:bg-green-100 border-0">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Verified Rate
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                                    ₹{Math.round(rate.totalAmount)}
                                </span>
                                <span className="text-sm font-medium text-[var(--text-secondary)]">
                                    .{rate.totalAmount.toFixed(2).split('.')[1]}
                                </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                Inclusive of GST
                            </p>
                        </div>
                    </div>

                    {/* Middle Row: Key Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-y border-[var(--border-subtle)]/50 border-dashed">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Delivery</p>
                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                    {rate.estimatedDeliveryDays} Days
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-amber-50 text-amber-500">
                                <Star className="h-4 w-4 fill-amber-500" />
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Rating</p>
                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                    {rate.rating.toFixed(1)}/5
                                </p>
                            </div>
                        </div>

                        {rate.deliverySuccessRate > 0 && (
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-green-50 text-green-600">
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Success Rate</p>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">
                                        {rate.deliverySuccessRate.toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        )}

                        {rate.zone && (
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-purple-50 text-purple-600">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Zone</p>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">
                                        {rate.zone.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Row: Actions & Tags */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            {rate.tags.map((tag) => (
                                <Badge
                                    key={tag}
                                    className={cn(
                                        "text-[10px] font-medium border-0 px-2 py-1 rounded-md",
                                        getMedalColor(tag)
                                    )}
                                >
                                    {getBadgeIcon(tag)} {tag.replace('_', ' ')}
                                </Badge>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={onToggle}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors py-2"
                            >
                                {isExpanded ? 'Hide Details' : 'View Details'}
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <Button
                                onClick={handleBookNow}
                                size="sm"
                                className="flex-1 sm:flex-none shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                                Ship Now
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Expanded Details Section */}
                <div className={cn(
                    "grid grid-rows-[0fr] transition-all duration-300 ease-in-out bg-[var(--bg-secondary)]/30 border-t border-[var(--border-subtle)]",
                    isExpanded ? "grid-rows-[1fr] py-4" : "overflow-hidden"
                )}>
                    <div className="overflow-hidden px-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Breakdown */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Cost Breakdown</h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between text-[var(--text-secondary)]">
                                        <span>Base Freight</span>
                                        <span className="font-medium text-[var(--text-primary)]">₹{rate.baseRate.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[var(--text-secondary)]">
                                        <span className="flex items-center gap-1">
                                            Weight Charge
                                            {rate.weightCharge === 0 && <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">Free</span>}
                                        </span>
                                        <span className="font-medium text-[var(--text-primary)]">₹{rate.weightCharge.toFixed(2)}</span>
                                    </div>
                                    {rate.codCharge > 0 && (
                                        <div className="flex justify-between text-[var(--text-secondary)]">
                                            <span>COD Handling</span>
                                            <span className="font-medium text-[var(--text-primary)]">₹{rate.codCharge.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {rate.fuelCharge > 0 && (
                                        <div className="flex justify-between text-[var(--text-secondary)]">
                                            <span>Fuel Surcharge</span>
                                            <span className="font-medium text-[var(--text-primary)]">₹{rate.fuelCharge.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-[var(--text-secondary)] pt-2 border-t border-dashed border-[var(--border-subtle)]">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-[var(--text-primary)]">₹{(rate.totalAmount - rate.gstAmount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[var(--text-secondary)]">
                                        <span>GST (18%)</span>
                                        <span className="font-medium text-[var(--text-primary)]">₹{rate.gstAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-[var(--border-subtle)] font-bold text-[var(--text-primary)] text-sm">
                                        <span>Total Payable</span>
                                        <span>₹{rate.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Scores */}
                            <div>
                                <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">AI Performance Score</h4>
                                <div className="space-y-3">
                                    {Object.entries(rate.scores).filter(([key]) => key !== 'overallScore').map(([key, value]) => (
                                        <div key={key} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-[var(--text-secondary)] capitalize">{key.replace('Score', '')}</span>
                                                <span className={cn("font-bold", getScoreColor(value))}>{Math.round(value)}/100</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500",
                                                        value >= 80 ? "bg-green-500" :
                                                            value >= 60 ? "bg-blue-500" :
                                                                value >= 40 ? "bg-yellow-500" : "bg-red-500"
                                                    )}
                                                    style={{ width: `${value}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]/50 flex items-center justify-between">
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Overall Match</span>
                                        <Badge variant={rate.scores.overallScore >= 80 ? 'success' : 'neutral'} className="text-xs">
                                            {Math.round(rate.scores.overallScore)}% Match
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
