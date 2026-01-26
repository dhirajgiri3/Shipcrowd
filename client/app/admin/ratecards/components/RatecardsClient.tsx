"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    CreditCard,
    Plus,
    Search,
    Edit2,
    Copy,
    CheckCircle,
    AlertCircle,
    Package,
    Download,
    CheckSquare,
    Square,
    Power,
    PowerOff,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import Link from 'next/link';
import { useRateCards } from '@/src/core/api/hooks/logistics/useRateCards';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useBulkUpdateRateCards, useExportRateCards } from '@/src/hooks/shipping/use-bulk-rate-card-operations';

const categories = ['all', 'lite', 'basic', 'advanced', 'pro', 'enterprise'];
const couriers = ['All Couriers', 'Delhivery', 'Xpressbees', 'DTDC', 'Bluedart', 'Ecom Express'];

export function RatecardsClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const { addToast } = useToast();

    // Integration: Fetch real rate cards
    const { data: rateCards = [], isLoading, isError, error } = useRateCards();

    // Bulk operations hooks
    const { mutate: bulkUpdate, isPending: isBulkUpdating } = useBulkUpdateRateCards();
    const { mutate: exportCards, isPending: isExporting } = useExportRateCards();

    const handleSelectAll = () => {
        if (selectedCards.length === filteredRateCards.length) {
            setSelectedCards([]);
        } else {
            setSelectedCards(filteredRateCards.map(card => card._id));
        }
    };

    const handleSelectCard = (cardId: string) => {
        setSelectedCards(prev =>
            prev.includes(cardId)
                ? prev.filter(id => id !== cardId)
                : [...prev, cardId]
        );
    };

    const handleBulkActivate = () => {
        if (selectedCards.length === 0) {
            addToast('Please select at least one rate card', 'error');
            return;
        }
        bulkUpdate({
            rateCardIds: selectedCards,
            operation: 'activate'
        }, {
            onSuccess: () => {
                setSelectedCards([]);
                setShowBulkActions(false);
            }
        });
    };

    const handleBulkDeactivate = () => {
        if (selectedCards.length === 0) {
            addToast('Please select at least one rate card', 'error');
            return;
        }
        bulkUpdate({
            rateCardIds: selectedCards,
            operation: 'deactivate'
        }, {
            onSuccess: () => {
                setSelectedCards([]);
                setShowBulkActions(false);
            }
        });
    };

    const handleBulkPriceAdjustment = (type: 'increase' | 'decrease') => {
        if (selectedCards.length === 0) {
            addToast('Please select at least one rate card', 'error');
            return;
        }

        const value = prompt(`Enter ${type === 'increase' ? 'increase' : 'decrease'} percentage (e.g., 10 for 10%)`);
        if (!value) return;

        const percentage = parseFloat(value);
        if (isNaN(percentage) || percentage <= 0) {
            addToast('Please enter a valid percentage', 'error');
            return;
        }

        bulkUpdate({
            rateCardIds: selectedCards,
            operation: 'adjust_price',
            adjustmentType: 'percentage',
            adjustmentValue: type === 'increase' ? percentage : -percentage
        }, {
            onSuccess: () => {
                setSelectedCards([]);
                setShowBulkActions(false);
            }
        });
    };

    const handleExport = () => {
        exportCards();
    };

    // Handle error
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertCircle className="h-10 w-10 text-[var(--error)] mb-2" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Failed to load rate cards</h3>
                <p className="text-[var(--text-secondary)] mb-4">{error?.message || 'An unexpected error occurred'}</p>
                <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
            </div>
        );
    }

    if (isLoading) {
        return <Loader centered size="lg" message="Loading rate cards..." />;
    }

    const filteredRateCards = rateCards.filter(card => {
        const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || card.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <CreditCard className="h-6 w-6 text-[var(--primary-blue)]" />
                        Rate Cards
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
                        Manage pricing plans for courier services
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {isExporting ? 'Exporting...' : 'Export CSV'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowBulkActions(!showBulkActions)}
                    >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Bulk Actions
                    </Button>
                    <Link href="/admin/ratecards/create">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Rate Card
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {showBulkActions && (
                <Card className="bg-indigo-50 border-indigo-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSelectAll}
                                >
                                    {selectedCards.length === filteredRateCards.length ? (
                                        <CheckSquare className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Square className="h-4 w-4 mr-2" />
                                    )}
                                    Select All ({selectedCards.length}/{filteredRateCards.length})
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBulkActivate}
                                    disabled={selectedCards.length === 0 || isBulkUpdating}
                                >
                                    <Power className="h-4 w-4 mr-2" />
                                    Activate
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBulkDeactivate}
                                    disabled={selectedCards.length === 0 || isBulkUpdating}
                                >
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Deactivate
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBulkPriceAdjustment('increase')}
                                    disabled={selectedCards.length === 0 || isBulkUpdating}
                                >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Increase Price
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBulkPriceAdjustment('decrease')}
                                    disabled={selectedCards.length === 0 || isBulkUpdating}
                                >
                                    <TrendingDown className="h-4 w-4 mr-2" />
                                    Decrease Price
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Total Rate Cards</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{rateCards.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--primary-blue-soft)]">
                                <CreditCard className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Active</p>
                                <p className="text-2xl font-bold text-[var(--success)]">
                                    {rateCards.filter(c => c.status === 'active').length}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--success-bg)]">
                                <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <Input
                                placeholder="Search rate cards..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                icon={<Search className="h-4 w-4" />}
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as any)}
                            className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Rate Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRateCards.map((card) => (
                    <Card
                        key={card._id}
                        className={cn(
                            "hover:shadow-lg transition-all cursor-pointer group",
                            selectedCards.includes(card._id) && "ring-2 ring-indigo-500"
                        )}
                        onClick={() => addToast(`Opening ${card.name}...`, 'info')}
                    >
                        <CardContent className="p-5">
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {showBulkActions && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectCard(card._id);
                                                }}
                                                className="cursor-pointer"
                                            >
                                                {selectedCards.includes(card._id) ? (
                                                    <CheckSquare className="h-5 w-5 text-indigo-600" />
                                                ) : (
                                                    <Square className="h-5 w-5 text-[var(--text-muted)]" />
                                                )}
                                            </div>
                                        )}
                                        <div className="h-12 w-12 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold text-[var(--text-secondary)]">
                                            RC
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">
                                                {card.name}
                                            </h3>
                                        </div>
                                    </div>
                                    <Badge variant={card.status === 'active' ? 'success' : 'neutral'}>
                                        {card.status}
                                    </Badge>
                                </div>

                                {/* Zone Rules Summary */}
                                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                                    <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Zone Rules</p>
                                    <div className="flex flex-wrap gap-2 text-center">
                                        {card.zoneRules && card.zoneRules.length > 0 ? (
                                            card.zoneRules.slice(0, 5).map((rule, idx) => (
                                                <div key={idx} className="bg-[var(--bg-primary)] px-2 py-1 rounded text-xs border border-[var(--border-subtle)]">
                                                    <span className="font-semibold text-[var(--text-primary)]">{rule.zone}:</span> {rule.multiplier}x
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">No specific zone rules</span>
                                        )}
                                    </div>
                                </div>

                                {/* Base Rates Summary */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-[var(--text-muted)]">Base Rates</p>
                                    <div className="flex flex-wrap gap-2">
                                        {card.baseRates && card.baseRates.map((rate, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                                {rate.carrier} - {rate.serviceType}: ₹{rate.baseRate}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <Package className="h-3.5 w-3.5" />
                                            Active
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={(e) => {
                                            e.stopPropagation();
                                            addToast('Rate card duplicated!', 'success');
                                        }}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={(e) => {
                                            e.stopPropagation();
                                            addToast('Opening editor...', 'info');
                                        }}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredRateCards.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No rate cards found</h3>
                        <p className="mt-1 text-[var(--text-secondary)]">Try adjusting your filters or create a new rate card</p>
                        <Link href="/admin/ratecards/create">
                            <Button className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Rate Card
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
