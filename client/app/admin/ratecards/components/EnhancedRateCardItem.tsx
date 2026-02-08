"use client";

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import {
    Truck,
    MoreVertical,
    Copy,
    Trash2,
    BarChart3,
    CheckSquare,
    Square
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';

interface EnhancedRateCardItemProps {
    card: any;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onClone: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
    selectionMode?: boolean;
    isCloning?: boolean;
    isDeleting?: boolean;
}

export function EnhancedRateCardItem({
    card,
    isSelected,
    onSelect,
    onClone,
    onDelete,
    selectionMode = false,
    isCloning = false,
    isDeleting = false,
}: EnhancedRateCardItemProps) {
    const baseRate = card.baseRates?.[0];
    const basePrice = baseRate?.basePrice ?? baseRate?.baseRate ?? 0;
    const minFare = card.minimumFare ?? card.minimumCall ?? 0;
    const zones = card.zoneRules?.length || 0;
    const codPercent = card.codPercentage ?? 0;
    const courier = baseRate?.carrier || '—';
    const service = baseRate?.serviceType || '—';

    return (
        <Card
            className={cn(
                "relative overflow-hidden border-[var(--border-default)] hover:border-[var(--primary-blue)] transition-all group",
                isSelected && "border-[var(--primary-blue)]"
            )}
        >
            {selectionMode && (
                <div className="absolute top-4 left-4 z-10">
                    <button
                        type="button"
                        onClick={() => onSelect(card._id)}
                        className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                            isSelected
                                ? "bg-[var(--primary-blue)] text-white"
                                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:bg-[var(--bg-secondary)]"
                        )}
                    >
                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                </div>
            )}

            <div className="absolute top-4 right-4">
                <StatusBadge domain="ratecard" status={card.status} showIcon />
            </div>

            <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center">
                        <Truck className="w-6 h-6 text-[var(--primary-blue)]" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[var(--text-body-base)] font-semibold line-clamp-1">
                            {card.name}
                        </h3>
                        <p className="text-[var(--text-caption)] text-[var(--text-muted)]">
                            {courier} • {service}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg">
                    <div>
                        <p className="text-[var(--text-caption)] text-[var(--text-muted)]">Base Rate</p>
                        <p className="text-[var(--text-body-sm)] font-mono font-semibold">₹{basePrice}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-caption)] text-[var(--text-muted)]">Min Fare</p>
                        <p className="text-[var(--text-body-sm)] font-mono font-semibold">₹{minFare}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-caption)] text-[var(--text-muted)]">Zones</p>
                        <p className="text-[var(--text-body-sm)] font-semibold">{zones || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-caption)] text-[var(--text-muted)]">COD</p>
                        <p className="text-[var(--text-body-sm)] font-semibold">{codPercent}%</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href={`/admin/ratecards/${card._id}`}>
                            <Button variant="outline" size="sm">
                                View Details
                            </Button>
                        </Link>
                        <Link href={`/admin/ratecards/${card._id}/analytics`}>
                            <Button variant="ghost" size="sm">
                                <BarChart3 className="w-4 h-4 mr-2" /> Analytics
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onClone(card._id, card.name)}
                            disabled={isCloning}
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(card._id, card.name)}
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-4 h-4 text-[var(--error)]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="opacity-60">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
