"use client";

import { motion } from "framer-motion";
import {
    CreditCard,
    MoreHorizontal,
    Copy,
    Edit2,
    Trash2,
    CheckSquare,
    Square,
    Zap,
    Lock,
    Tag,
    MapPin,
    Package,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { Badge } from "@/src/components/ui/core/Badge";
import { Button } from "@/src/components/ui/core/Button";
import { cn } from "@/src/lib/utils";
import Link from "next/link";
import { useState } from "react";

import { useRouter } from "next/navigation";

interface RateCardItemProps {
    card: any; // Type should be imported from types definition if available
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
    isDeleting = false
}: RateCardItemProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate generic stats
    const activeZones = card.zoneRules?.length || 0;
    const baseRatesCount = card.baseRates?.length || 0;
    const weightRulesCount = card.weightRules?.length || 0;

    const handleCardClick = () => {
        if (selectionMode) {
            onSelect(card._id);
        } else {
            router.push(`/admin/ratecards/${card._id}`);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "group relative overflow-hidden rounded-2xl border transition-all duration-200",
                "bg-[var(--bg-primary)] hover:border-[var(--primary-blue-light)]",
                isSelected
                    ? "border-[var(--primary-blue)] ring-1 ring-[var(--primary-blue)]"
                    : "border-[var(--border-subtle)]"
            )}
            onClick={handleCardClick}
        >
            {/* Selection Overlay/Indicator */}
            {selectionMode && (
                <div className="absolute top-3 left-3 z-10">
                    <div className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                        isSelected
                            ? "bg-[var(--primary-blue)] text-white"
                            : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:bg-[var(--bg-secondary)]"
                    )}>
                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </div>
                </div>
            )}

            {/* Main Content Container */}
            <div className="p-5">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between pl-8 relative">
                    {/* Icon - absolute to align with selection check or just indent */}
                    <div className={cn(
                        "absolute -left-1 top-0 hidden md:flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                        isSelected
                            ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]"
                            : "bg-[var(--bg-secondary)] text-[var(--text-tertiary)] group-hover:text-[var(--primary-blue)] group-hover:bg-[var(--primary-blue-soft)]"
                    )}>
                        <CreditCard className="h-5 w-5" />
                    </div>

                    <div className="pl-2">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">
                                {card.name}
                            </h3>
                            {card.isLocked && <Lock className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant={card.status === 'active' ? 'success' : 'neutral'} className="h-5 px-2 text-[10px] uppercase tracking-wider">
                                {card.status}
                            </Badge>
                            {card.version && (
                                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                                    <Tag className="h-3 w-3" /> {card.version}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions (visible on hover or always on touch) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClone(card._id, card.name);
                            }}
                            disabled={isCloning}
                        >
                            <Copy className="h-4 w-4 text-[var(--text-secondary)] hover:text-[var(--primary-blue)]" />
                        </Button>
                        <Link href={`/admin/ratecards/${card._id}/edit`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit2 className="h-4 w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-subtle)]">
                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Fuel Surcharge</p>
                        <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                            <Zap className="h-4 w-4 text-orange-500 fill-orange-500/20" />
                            <span>{card.fuelSurcharge}%</span>
                        </div>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-subtle)]">
                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Min Call</p>
                        <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                            <span className="text-xs text-[var(--text-muted)]">₹</span>
                            <span>{card.minimumCall}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Info Line */}
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-3">
                    <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{activeZones} Zones</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" />
                        <span>{baseRatesCount} Services</span>
                    </div>
                    <div className="flex-1 text-right font-mono text-[var(--text-tertiary)]">
                        ID: {card._id.slice(-6)}
                    </div>
                </div>
            </div>

            {/* Hover Footer Actions (Optional Expansion) */}
            <div className="bg-[var(--bg-tertiary)] px-5 py-2 flex items-center justify-between opacity-0 h-0 group-hover:h-auto group-hover:opacity-100 transition-all overflow-hidden">
                <span className="text-[10px] text-[var(--text-muted)]">Last updated mostly recently</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(card._id, card.name);
                    }}
                    className="text-[var(--error)] hover:text-red-600 text-xs flex items-center gap-1 font-medium transition-colors"
                    disabled={isDeleting}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                </button>
            </div>
        </motion.div>
    );
}
