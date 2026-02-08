"use client";

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Truck,
    Copy,
    Trash2,
    BarChart3,
    CheckSquare,
    Square,
    Edit2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';

interface RateCardItemProps {
    card: any;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onClone: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
    selectionMode?: boolean;
    isCloning?: boolean;
    isDeleting?: boolean;
}

export function RateCardItem({
    card,
    isSelected,
    onSelect,
    onClone,
    onDelete,
    selectionMode = false,
    isCloning = false,
    isDeleting = false,
}: RateCardItemProps) {
    const zonePricing = card.zonePricing || {};
    const basePrice = zonePricing?.zoneA?.basePrice ?? 0;
    const minFare = card.minimumFare ?? 0;
    const zones = Object.keys(zonePricing).length || 0;
    const codPercent = card.codPercentage ?? 0;
    const courier = 'Zone Pricing';
    const service = card.shipmentType ? (card.shipmentType === 'reverse' ? 'Reverse' : 'Forward') : 'All';
    const category = card.rateCardCategory;

    return (
        <Card
            className={cn(
                "relative overflow-hidden border-[var(--border-default)] bg-[var(--bg-primary)] shadow-sm hover:shadow-md hover:border-[var(--primary-blue)] transition-all group",
                isSelected && "border-[var(--primary-blue)] ring-1 ring-[var(--primary-blue)]/20"
            )}
        >
            <CardContent className="p-8">
                <div className="flex items-start justify-between gap-6">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--primary-blue-soft)] flex items-center justify-center">
                            <Truck className="w-7 h-7 text-[var(--primary-blue)]" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] line-clamp-2">
                                {card.name}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                {courier} • {service}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <Badge variant="secondary" size="sm">{courier}</Badge>
                                <Badge variant="secondary" size="sm">{service}</Badge>
                                {category && <Badge variant="outline" size="sm">{category}</Badge>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {selectionMode && (
                            <button
                                type="button"
                                onClick={() => onSelect(card._id)}
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                                    isSelected
                                        ? "bg-[var(--primary-blue)] text-white"
                                        : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:bg-[var(--bg-secondary)]"
                                )}
                                aria-label={isSelected ? "Deselect rate card" : "Select rate card"}
                            >
                                {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </button>
                        )}
                        <StatusBadge domain="ratecard" status={card.status} showIcon size="sm" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Base Rate</p>
                        <p className="text-lg font-mono font-semibold text-[var(--text-primary)] mt-1">₹{basePrice}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Min Fare</p>
                        <p className="text-lg font-mono font-semibold text-[var(--text-primary)] mt-1">₹{minFare}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Zones</p>
                        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{zones || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">COD</p>
                        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{codPercent}%</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-6">
                    <Link href={`/admin/ratecards/${card._id}`}>
                        <Button size="md" className="min-w-[140px]">
                            View Details
                        </Button>
                    </Link>
                    <Link href={`/admin/ratecards/${card._id}/edit`}>
                        <Button variant="outline" size="md">
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                    </Link>
                    <Link href={`/admin/ratecards/${card._id}/analytics`}>
                        <Button variant="outline" size="md">
                            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
                        </Button>
                    </Link>
                    <div className="flex items-center gap-1 ml-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onClone(card._id, card.name)}
                            disabled={isCloning}
                            aria-label="Clone rate card"
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(card._id, card.name)}
                            disabled={isDeleting}
                            aria-label="Delete rate card"
                        >
                            <Trash2 className="w-4 h-4 text-[var(--error)]" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
