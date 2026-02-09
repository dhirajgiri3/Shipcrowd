"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import {
    CreditCard,
    Plus,
    Search,
    Download,
    CheckSquare,
    Square,
    Power,
    PowerOff,
    TrendingUp,
    TrendingDown,
    IndianRupee,
    Upload,
    CheckCircle,
    X,
    MoreVertical
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminRateCards, useAdminRateCardStats, useCloneAdminRateCard, useDeleteAdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useBulkUpdateRateCards, useExportRateCards } from '@/src/hooks/shipping/use-bulk-rate-card-operations';
import { UploadRateCardModal } from './UploadRateCardModal';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { motion, AnimatePresence } from 'framer-motion';
import { RateCardItem } from './RateCardItem';
import { BulkActionsPanel } from './BulkActionsPanel';
import { useDebouncedValue } from '@/src/hooks/data';
import { useAdminCompanies } from '@/src/core/api/hooks/admin/companies/useCompanies';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/src/components/ui/feedback/Dialog';

import { Pagination } from '@/src/components/ui/data/Pagination';

export function RatecardsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const search = searchParams.get('search') || '';
    const [searchInput, setSearchInput] = useState(search);
    const debouncedSearch = useDebouncedValue(searchInput, 400);
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive' | 'draft' | 'expired'>('all');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [cloneTarget, setCloneTarget] = useState<{ id: string; name: string } | null>(null);
    const { addToast } = useToast();
    const { data: companiesData } = useAdminCompanies({ limit: 200 });

    useEffect(() => {
        if (debouncedSearch === search) return;
        const params = new URLSearchParams(searchParams.toString());
        if (!debouncedSearch) {
            params.delete('search');
        } else {
            params.set('search', debouncedSearch);
        }
        router.push(`?${params.toString()}`, { scroll: false });
    }, [debouncedSearch, search, searchParams, router]);

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, selectedStatus, selectedCompanyId, selectedCategory]);

    useEffect(() => {
        setSelectedCards([]);
    }, [selectedCompanyId]);

    // Integration: Fetch real rate cards
    const { data: adminData, isLoading, isError, error, refetch } = useAdminRateCards({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        companyId: selectedCompanyId === 'all' ? undefined : selectedCompanyId,
        search: debouncedSearch || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        page,
        limit,
    });
    const { data: statsData } = useAdminRateCardStats({
        companyId: selectedCompanyId === 'all' ? undefined : selectedCompanyId
    });
    const rateCards = adminData?.rateCards || [];
    const pagination = adminData?.pagination || {};

    // Bulk operations hooks
    const { mutate: bulkUpdate, isPending: isBulkUpdating } = useBulkUpdateRateCards();
    const { mutate: exportCards, isPending: isExporting } = useExportRateCards();

    // Single operations hooks
    const { mutate: cloneCard, isPending: isCloning } = useCloneAdminRateCard();
    const { mutate: deleteCard, isPending: isDeleting } = useDeleteAdminRateCard();

    // Frontend filtering is NOT needed if backend handles search, 
    // BUT since we might want to support client-side search on current page if API doesn't fully support it (it does),
    // we can keep it simple. However, best practice with pagination is to rely on backend results.
    // The previous code did client-side filtering on the fetched data. 
    // Since we are now paginating, `rateCards` only contains the current page.
    // So we should rely on the API's search.
    const filteredRateCards = rateCards;

    const categoryOptions = useMemo(() => {
        // ideally categories should come from a separate API or aggregation
        const categories = new Set<string>();
        rateCards.forEach(card => {
            if (card.rateCardCategory) categories.add(card.rateCardCategory);
        });
        return Array.from(categories).filter(Boolean);
    }, [rateCards]);

    const companyOptions = companiesData?.companies || [];

    const selectedCardsCompanyIds = useMemo(() => {
        const ids = new Set<string>();
        rateCards.forEach(card => {
            if (selectedCards.includes(card._id)) {
                const companyId = typeof card.companyId === 'string' ? card.companyId : card.companyId?._id;
                if (companyId) ids.add(companyId);
            }
        });
        return ids;
    }, [rateCards, selectedCards]);

    const inferredCompanyId = selectedCardsCompanyIds.size === 1 ? Array.from(selectedCardsCompanyIds)[0] : null;
    const effectiveCompanyId = selectedCompanyId !== 'all' ? selectedCompanyId : inferredCompanyId;
    const canBulkOperate = !!effectiveCompanyId && selectedCards.length > 0 && selectedCardsCompanyIds.size <= 1;
    const canExport = !!effectiveCompanyId;
    const canImport = companyOptions.length > 0;

    const handleClone = (id: string, name: string) => {
        setCloneTarget({ id, name });
    };

    const handleDelete = (id: string, name: string) => {
        setDeleteTarget({ id, name });
    };

    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = '/samples/shipcrowd_ratecard_zone_pricing_template.csv';
        link.download = 'shipcrowd_ratecard_zone_pricing_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
        if (!canBulkOperate || !effectiveCompanyId) {
            addToast('Select rate cards from a single company to bulk update', 'error');
            return;
        }
        bulkUpdate({ companyId: effectiveCompanyId, rateCardIds: selectedCards, operation: 'activate' }, {
            onSuccess: () => {
                setSelectedCards([]);
                setShowBulkActions(false);
            }
        });
    };

    const handleBulkDeactivate = () => {
        if (!canBulkOperate || !effectiveCompanyId) {
            addToast('Select rate cards from a single company to bulk update', 'error');
            return;
        }
        bulkUpdate({ companyId: effectiveCompanyId, rateCardIds: selectedCards, operation: 'deactivate' }, {
            onSuccess: () => {
                setSelectedCards([]);
                setShowBulkActions(false);
            }
        });
    };

    const handleBulkPriceAdjustment = (type: 'increase' | 'decrease', rawValue?: number) => {
        if (!canBulkOperate || !effectiveCompanyId) {
            addToast('Select rate cards from a single company to bulk update', 'error');
            return;
        }
        if (typeof rawValue !== 'number' || Number.isNaN(rawValue) || rawValue <= 0) {
            addToast('Please enter a valid percentage', 'error');
            return;
        }
        bulkUpdate({
            companyId: effectiveCompanyId,
            rateCardIds: selectedCards,
            operation: 'adjust_price',
            adjustmentType: 'percentage',
            adjustmentValue: type === 'increase' ? rawValue : -rawValue
        }, {
            onSuccess: () => {
                setSelectedCards([]);
                setShowBulkActions(false);
            }
        });
    };

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="h-12 w-12 rounded-full bg-[var(--error-bg)] flex items-center justify-center mb-4">
                    <X className="h-6 w-6 text-[var(--error)]" />
                </div>
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Failed to load rate cards</h3>
                <p className="text-[var(--text-secondary)] mb-4">{error?.message || 'An unexpected error occurred'}</p>
                <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
            </div>
        );
    }

    // Don't block UI with full page loader on subsequent fetches (like page change)
    // adminData check ensures we show loader only on FIRST load
    if (isLoading && !adminData) {
        return <Loader centered size="lg" message="Loading rate cards..." />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <CreditCard className="h-6 w-6 text-[var(--primary-blue)]" />
                        Rate Cards Management
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
                        Configure and manage zone-based pricing rules
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/pricing-studio">
                        <Button variant="outline">
                            <TrendingUp className="h-4 w-4 mr-2" /> Pricing Studio
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (!canImport) {
                                addToast('No companies available to import rate cards', 'error');
                                return;
                            }
                            setShowImportModal(true);
                        }}
                        disabled={!canImport}
                    >
                        <Upload className="h-4 w-4 mr-2" /> Import
                    </Button>
                    <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-2" /> CSV Template
                    </Button>
                    <Link href="/admin/ratecards/create">
                        <Button className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/20">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Rate Card
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Cards"
                    value={statsData?.total ?? rateCards.length}
                    icon={CreditCard}
                    iconColor="text-[var(--primary-blue)] bg-[var(--primary-blue-soft)]"
                    variant="default"
                />
                <StatsCard
                    title="Active Now"
                    value={statsData?.active ?? rateCards.filter(c => c.status === 'active').length}
                    icon={CheckCircle}
                    variant="success"
                />
                <StatsCard
                    title="Avg Rate/kg"
                    value={statsData?.avgRatePerKg !== undefined ? `₹${statsData.avgRatePerKg}` : '—'}
                    icon={TrendingUp}
                    iconColor="text-[var(--info)] bg-[var(--info-bg)]"
                    variant="info"
                />
                <StatsCard
                    title="Revenue (30d)"
                    value={statsData?.revenue30d !== undefined ? `₹${statsData.revenue30d}` : '—'}
                    icon={IndianRupee}
                    iconColor="text-[var(--warning)] bg-[var(--warning-bg)]"
                    variant="warning"
                />
            </div>

            {/* Control Bar */}
            <Card className="border-[var(--border-subtle)] overflow-hidden">
                <div className="p-1">
                    <div className="flex flex-col lg:flex-row gap-3 p-2">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search rate cards..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)]/20 transition-all placeholder-[var(--text-muted)]"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative min-w-[150px]">
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value as any)}
                                className="w-full h-10 pl-3 pr-8 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border-none focus:ring-2 focus:ring-[var(--primary-blue)] appearance-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="draft">Draft</option>
                                <option value="expired">Expired</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <MoreVertical className="h-4 w-4 text-[var(--text-muted)] opacity-50" />
                            </div>
                        </div>

                        {/* Company Filter */}
                        <div className="relative min-w-[200px]">
                            <select
                                value={selectedCompanyId}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                className="w-full h-10 pl-3 pr-8 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border-none focus:ring-2 focus:ring-[var(--primary-blue)] appearance-none cursor-pointer"
                            >
                                <option value="all">All Companies</option>
                                {companyOptions.map(company => (
                                    <option key={company._id} value={company._id}>{company.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <MoreVertical className="h-4 w-4 text-[var(--text-muted)] opacity-50" />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="relative min-w-[180px]">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full h-10 pl-3 pr-8 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border-none focus:ring-2 focus:ring-[var(--primary-blue)] appearance-none cursor-pointer"
                            >
                                <option value="all">All Categories</option>
                                {categoryOptions.map(category => (
                                    <option key={category} value={category}>
                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <MoreVertical className="h-4 w-4 text-[var(--text-muted)] opacity-50" />
                            </div>
                        </div>

                        {/* Selection Mode Toggle & Bulk Actions Trigger */}
                        <Button
                            variant={showBulkActions ? "secondary" : "ghost"}
                            className={cn(
                                "gap-2",
                                showBulkActions && "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]"
                            )}
                            onClick={() => setShowBulkActions(!showBulkActions)}
                        >
                            <CheckSquare className="h-4 w-4" />
                            <span className="hidden sm:inline">Select & Edit</span>
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (!effectiveCompanyId) {
                                    addToast('Select a company (or cards from one company) to export rate cards', 'error');
                                    return;
                                }
                                exportCards({ companyId: effectiveCompanyId });
                            }}
                            disabled={isExporting || !canExport}
                            className="gap-2"
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                    </div>

                    {/* Bulk Actions Panel */}
                    <AnimatePresence>
                        {showBulkActions && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
                            >
                                <div className="p-3 flex items-center justify-between gap-4 overflow-x-auto">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSelectAll}
                                            className="text-xs"
                                        >
                                            {selectedCards.length === filteredRateCards.length ? (
                                                <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                                            ) : (
                                                <Square className="h-3.5 w-3.5 mr-1.5" />
                                            )}
                                            Select All ({selectedCards.length})
                                        </Button>
                                        <div className="h-4 w-px bg-[var(--border-default)]" />
                                        <span className="text-xs text-[var(--text-secondary)]">
                                            {selectedCards.length} Selected
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Card>

            {
                selectedCards.length > 0 && (
                    <BulkActionsPanel
                        selectedCount={selectedCards.length}
                        onActivate={handleBulkActivate}
                        onDeactivate={handleBulkDeactivate}
                        onAdjustPrice={(type, value) => {
                            handleBulkPriceAdjustment(type, value);
                            setTimeout(() => setShowBulkActions(false), 0);
                        }}
                        disabled={!canBulkOperate || isBulkUpdating}
                    />
                )
            }

            {/* Rate Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                <AnimatePresence mode="popLayout">
                    {filteredRateCards.map((card) => (
                        <RateCardItem
                            key={card._id}
                            card={card}
                            isSelected={selectedCards.includes(card._id)}
                            onSelect={handleSelectCard}
                            onClone={handleClone}
                            onDelete={handleDelete}
                            selectionMode={showBulkActions}
                            isCloning={isCloning}
                            isDeleting={isDeleting}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {
                filteredRateCards.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--bg-secondary)] rounded-2xl border-2 border-dashed border-[var(--border-subtle)]">
                        <div className="h-16 w-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                            <Search className="h-8 w-8 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No rate cards found</h3>
                        <p className="mt-1 text-[var(--text-secondary)] max-w-sm">
                            {searchInput
                                ? `No results found for "${searchInput}". Try a different search term.`
                                : "Get started by creating a new rate card or importing an existing one."}
                        </p>
                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchInput('');
                                    setSelectedStatus('all');
                                    setSelectedCompanyId('all');
                                    setSelectedCategory('all');
                                }}
                            >
                                Clear Filters
                            </Button>
                            <Link href="/admin/ratecards/create">
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New
                                </Button>
                            </Link>
                        </div>
                    </div>
                )
            }

            {/* Pagination Component */}
            {
                filteredRateCards.length > 0 && pagination && (
                    <Card className="border-[var(--border-subtle)] overflow-hidden mt-4">
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.pages || 1}
                            totalItems={pagination.total || 0}
                            pageSize={limit}
                            onPageChange={setPage}
                            onPageSizeChange={(newSize) => {
                                setLimit(newSize);
                                setPage(1);
                            }}
                            pageSizeOptions={[10, 20, 50, 100]}
                            className="border-none"
                        />
                    </Card>
                )
            }

            <UploadRateCardModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={() => refetch()}
                companyId={effectiveCompanyId || undefined}
                companies={companyOptions}
            />

            <Dialog open={!!cloneTarget} onOpenChange={(open) => !open && setCloneTarget(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Clone rate card</DialogTitle>
                        <DialogDescription>
                            {cloneTarget
                                ? `Create a copy of "${cloneTarget.name}"?`
                                : 'Create a copy of this rate card?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloneTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (!cloneTarget) return;
                                cloneCard(cloneTarget.id, {
                                    onSuccess: (newCard) => {
                                        addToast(`Successfully cloned "${cloneTarget.name}" as "${newCard.name}"`, 'success');
                                        setCloneTarget(null);
                                    },
                                    onError: (err) => {
                                        addToast(`Failed to clone: ${err.message}`, 'error');
                                    }
                                });
                            }}
                            disabled={isCloning}
                        >
                            Clone
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete rate card</DialogTitle>
                        <DialogDescription>
                            {deleteTarget
                                ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
                                : 'Are you sure you want to delete this rate card?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (!deleteTarget) return;
                                deleteCard(deleteTarget.id, {
                                    onSuccess: () => {
                                        addToast(`Successfully deleted "${deleteTarget.name}"`, 'success');
                                        if (selectedCards.includes(deleteTarget.id)) {
                                            setSelectedCards(prev => prev.filter(cardId => cardId !== deleteTarget.id));
                                        }
                                        setDeleteTarget(null);
                                    },
                                    onError: (err) => {
                                        addToast(`Failed to delete: ${err.message}`, 'error');
                                    }
                                });
                            }}
                            disabled={isDeleting}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
