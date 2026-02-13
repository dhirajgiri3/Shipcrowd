"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Tabs, TabsList, TabsTrigger } from '@/src/components/ui/core/Tabs';
import { Trophy, SearchX } from 'lucide-react';
import { CourierRateOption } from '@/src/core/api/clients/shipping/ratesApi';
import { RateCard } from './RateCard';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/core/Badge';

interface RateResultsProps {
    results: CourierRateOption[] | null;
    recommendation: string | null;
    expandedBreakdown: string | null;
    setExpandedBreakdown: (id: string | null) => void;
}

type SortOption = 'RECOMMENDED' | 'CHEAPEST' | 'FASTEST' | 'RATED';

export function RateResults({
    results,
    recommendation,
    expandedBreakdown,
    setExpandedBreakdown
}: RateResultsProps) {
    const [sortBy, setSortBy] = useState<SortOption>('RECOMMENDED');

    const sortedResults = useMemo(() => {
        if (!results) return [];
        const sorted = [...results];

        switch (sortBy) {
            case 'CHEAPEST':
                return sorted.sort((a, b) => a.totalAmount - b.totalAmount);
            case 'FASTEST':
                return sorted.sort((a, b) => a.estimatedDeliveryDays - b.estimatedDeliveryDays);
            case 'RATED':
                return sorted.sort((a, b) => b.rating - a.rating);
            case 'RECOMMENDED':
            default:
                // Assuming API returns recommended order, or we prioritize specific tags/scores
                // For now, let's keep API order but potentially boost 'RECOMMENDED' tag to top if not already
                return sorted.sort((a, b) => {
                    const aRec = a.tags.includes('RECOMMENDED') ? 1 : 0;
                    const bRec = b.tags.includes('RECOMMENDED') ? 1 : 0;
                    return bRec - aRec;
                });
        }
    }, [results, sortBy]);

    if (!results) {
        return (
            <Card className="border-dashed border-2 border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 shadow-none h-full min-h-[500px] flex items-center justify-center">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center max-w-md">
                    <div className="h-24 w-24 rounded-full bg-[var(--primary-blue)]/10 flex items-center justify-center mb-6 animate-pulse">
                        <Trophy className="h-10 w-10 text-[var(--primary-blue)]" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                        Find the Best Shipping Rates
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
                        Enter the pickup and delivery pincodes, along with shipment weight, to instantly compare rates from top couriers like BlueDart, Delhivery, and more.
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs opacity-60">
                        <div className="h-2 bg-[var(--border-subtle)] rounded w-full"></div>
                        <div className="h-2 bg-[var(--border-subtle)] rounded w-2/3"></div>
                        <div className="h-2 bg-[var(--border-subtle)] rounded w-3/4"></div>
                        <div className="h-2 bg-[var(--border-subtle)] rounded w-1/2"></div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-4">
                        We'll recommend the best option based on your preferences.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (results.length === 0) {
        return (
            <Card className="border-dashed border-2 border-[var(--border-subtle)] bg-transparent shadow-none">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                    <div className="h-16 w-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
                        <SearchX className="h-8 w-8 text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Couriers Found</h3>
                    <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                        We couldn't find any courier options for this route. Try changing the pincodes or weight.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const recommendedCourier = results.find(r => r.tags.includes('RECOMMENDED'));

    return (
        <div className="space-y-6">
            {/* Top Stats / Recommendation Banner (Only show if not sorting, or always show?) */}
            {/* Let's show a summary banner if we have a recommendation and default sort is active */}
            {sortBy === 'RECOMMENDED' && recommendedCourier && (
                <div className="bg-[var(--primary-blue-soft)]/40 border border-[var(--primary-blue-light)]/30 rounded-xl p-4 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-[var(--primary-blue)] flex items-center justify-center shadow-sm flex-shrink-0">
                        <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                                Top Pick: {recommendedCourier.courierName}
                            </p>
                            <Badge variant="success" className="h-5 text-[10px] px-1.5">Best Value</Badge>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Based on your preferences, this courier offers the best balance of price (₹{recommendedCourier.totalAmount}) and speed ({recommendedCourier.estimatedDeliveryDays} days).
                        </p>
                    </div>
                </div>
            )}

            {/* Sorting Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {results.length} Couriers Available
                </h2>
                <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-4 sm:w-auto bg-[var(--bg-secondary)] h-9 p-1">
                        <TabsTrigger value="RECOMMENDED" className="text-xs">Smart</TabsTrigger>
                        <TabsTrigger value="CHEAPEST" className="text-xs">Cheapest</TabsTrigger>
                        <TabsTrigger value="FASTEST" className="text-xs">Fastest</TabsTrigger>
                        <TabsTrigger value="RATED" className="text-xs">Best Rated</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Rate Options List */}
            <div className="space-y-4">
                {sortedResults.map((rate, index) => (
                    <div
                        key={`${rate.courierId}-${rate.serviceType}`}
                        className="animate-in fade-in slide-in-from-bottom-2 duration-500"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                    >
                        <RateCard
                            rate={rate}
                            isExpanded={expandedBreakdown === rate.courierId}
                            onToggle={() => setExpandedBreakdown(
                                expandedBreakdown === rate.courierId ? null : rate.courierId
                            )}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
