"use client";

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Trophy } from 'lucide-react';
import { CourierRateOption } from '@/src/core/api/clients/shipping/ratesApi';
import { RateCard } from './RateCard';

interface RateResultsProps {
    results: CourierRateOption[] | null;
    recommendation: string | null;
    expandedBreakdown: string | null;
    setExpandedBreakdown: (id: string | null) => void;
}

export function RateResults({
    results,
    recommendation,
    expandedBreakdown,
    setExpandedBreakdown
}: RateResultsProps) {
    if (!results) return null;

    if (results.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-[var(--text-secondary)]">
                        No courier options available for this route
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Recommendation Banner */}
            {recommendation && (
                <Card className="border border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/30">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-[var(--primary-blue)] flex items-center justify-center shadow-sm">
                            <Trophy className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--primary-blue)]">Top Recommendation</p>
                            <p className="text-lg font-bold text-[var(--text-primary)]">{recommendation}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Rate Options */}
            <div className="space-y-3">
                {results.map((rate) => (
                    <RateCard
                        key={`${rate.courierId}-${rate.serviceType}`}
                        rate={rate}
                        isExpanded={expandedBreakdown === rate.courierId}
                        onToggle={() => setExpandedBreakdown(
                            expandedBreakdown === rate.courierId ? null : rate.courierId
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
