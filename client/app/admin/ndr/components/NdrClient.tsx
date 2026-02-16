"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LazyBarChart as BarChart,
    LazyBar as Bar,
    LazyXAxis as XAxis,
    LazyYAxis as YAxis,
    LazyCartesianGrid as CartesianGrid,
    LazyTooltip as Tooltip,
    LazyResponsiveContainer as ResponsiveContainer,
    LazyCell as Cell
} from '@/src/components/features/charts/LazyCharts';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn, parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';
import {
    PackageX,
    RefreshCw,
    RotateCcw,
    AlertTriangle,
    Building2,
} from 'lucide-react';

import { useAdminNDRList, useNdrFunnel } from '@/src/core/api/hooks/admin/useAdminNDR';
import { useDebouncedValue } from '@/src/hooks/data';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
const DEFAULT_LIMIT = 10;

const NDR_TABS = [
    { key: 'all', label: 'All' },
    { key: 'detected', label: 'Detected' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'rto_triggered', label: 'RTO Triggered' },
    { key: 'resolved', label: 'Resolved' },
] as const;
type NdrTabKey = (typeof NDR_TABS)[number]['key'];
const isNdrTabKey = (value: string): value is NdrTabKey => NDR_TABS.some((tab) => tab.key === value);

// Status mapping helper
const getStatusColor = (status: string) => {
    switch (status) {
        case 'action_required': return 'bg-[var(--error-bg)] text-[var(--error)]';
        case 'pending_seller': return 'bg-[var(--warning-bg)] text-[var(--warning)]';
        default: return 'bg-[var(--info-bg)] text-[var(--info)]';
    }
};

export function NdrClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { page: urlPage, limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const [page, setPage] = useState(urlPage);
    const [activeTab, setActiveTab] = useState<NdrTabKey>('all');
    const hasInitializedFilterReset = useRef(false);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 500);
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const { addToast } = useToast();
    const {
        range: dateRange,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();
    const companyId = searchParams.get('companyId') || undefined;

    const statusFilter = activeTab === 'all' ? undefined : activeTab;

    useEffect(() => {
        const nextStatusParam = searchParams.get('status') || 'all';
        const nextStatus: NdrTabKey = isNdrTabKey(nextStatusParam) ? nextStatusParam : 'all';
        setActiveTab((current) => (current === nextStatus ? current : nextStatus));

        const nextSearch = searchParams.get('search') || '';
        setSearch((current) => (current === nextSearch ? current : nextSearch));

        const { page: nextPage } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        setPage((current) => (current === nextPage ? current : nextPage));
        setIsUrlHydrated(true);
    }, [searchParams]);

    useEffect(() => {
        if (!isUrlHydrated) return;
        if (!hasInitializedFilterReset.current) {
            hasInitializedFilterReset.current = true;
            return;
        }
        setPage(1);
    }, [debouncedSearch, activeTab, isUrlHydrated]);

    useEffect(() => {
        if (!isUrlHydrated) return;
        const params = new URLSearchParams(searchParams.toString());
        if (activeTab !== 'all') {
            params.set('status', activeTab);
        } else {
            params.delete('status');
        }
        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        } else {
            params.delete('search');
        }
        syncPaginationQuery(params, { page, limit }, { defaultLimit: DEFAULT_LIMIT });

        const nextQuery = params.toString();
        const currentQuery = searchParams.toString();
        if (nextQuery !== currentQuery) {
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        }
    }, [activeTab, debouncedSearch, page, limit, isUrlHydrated, searchParams, pathname, router]);

    // API Hooks
    const { data: ndrResponse, isLoading: isLoadingList, isError: isListError, error: listError, refetch: refetchList } = useAdminNDRList({
        status: statusFilter,
        search: debouncedSearch,
        startDate: startDateIso,
        endDate: endDateIso,
        companyId,
        page,
        limit,
    });

    const { data: funnelDataResponse, isLoading: isLoadingFunnel } = useNdrFunnel({
        startDate: startDateIso,
        endDate: endDateIso,
        companyId,
    });

    const ndrList = ndrResponse?.data || [];
    const funnelData = (funnelDataResponse || []).map((item: any) => ({
        name: item.stage,
        value: item.count,
        fill: item.fill,
    }));
    const stats = ndrResponse?.stats || { resolutionRate: 0, actionRequired: 0, total: 0, pendingSeller: 0, rtoInitiated: 0 };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <PageHeader
                title="NDR Management"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'NDR', active: true },
                ]}
                description="Monitor and resolve non-delivery reports"
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <DateRangePicker value={dateRange} onRangeChange={setRange} />
                        <Button variant="outline" className="border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)] hover:text-[var(--error)]">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            View High Risk ({stats.actionRequired})
                        </Button>
                    </div>
                }
            />

            {/* Funnel & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Funnel Chart */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-[var(--text-primary)]">NDR Resolution Funnel</h3>
                        <Badge variant="success" className="bg-[var(--success-bg)] text-[var(--success)] border-0">
                            {(stats.resolutionRate * 100).toFixed(0)}% Resolution Rate
                        </Badge>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                            <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'var(--bg-secondary)', opacity: 0.5 }}
                                    contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-subtle)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Quick Stats */}
                <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--error-bg)] to-[var(--error-bg)]/50 border border-[var(--error)]/20">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-[var(--error-bg)] text-[var(--error)]">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-[var(--error)] bg-[var(--bg-primary)]/50 px-2 py-1 rounded-full">+12 Today</span>
                        </div>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.actionRequired}</p>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Action Required</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-[var(--info-bg)] text-[var(--info)]">
                                <RefreshCw className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.pendingSeller}</p>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Reattempts Scheduled</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-[var(--warning-bg)] text-[var(--warning)]">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.rtoInitiated}</p>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">RTO Initiated</p>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="flex flex-col gap-6">

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-primary)] p-2 rounded-2xl border border-[var(--border-subtle)]">
                    <PillTabs
                        tabs={NDR_TABS}
                        activeTab={activeTab}
                        onTabChange={(key) => setActiveTab(key)}
                    />
                    <SearchInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search NDRs..."
                        widthClass="w-full md:w-80"
                    />
                </div>

                {/* NDR List - Cards Grid */}
                <div className="grid gap-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden">
                    {isLoadingList ? (
                        <div className="flex justify-center p-12">
                            <Loader variant="spinner" size="lg" centered />
                        </div>
                    ) : isListError ? (
                        <EmptyState
                            variant="error"
                            title="Failed to load NDR events"
                            description={(listError as Error)?.message || 'An error occurred while fetching NDR data.'}
                            action={{
                                label: 'Retry',
                                onClick: () => refetchList(),
                                variant: 'outline',
                                icon: <RefreshCw className="w-4 h-4" />,
                            }}
                        />
                    ) : ndrList.length === 0 ? (
                        <EmptyState
                            variant="noItems"
                            title="No NDR events found"
                            description={
                                debouncedSearch || statusFilter
                                    ? 'Try adjusting your filters or search to find NDR events.'
                                    : 'No non-delivery reports in the selected date range. NDRs will appear here when delivery attempts fail.'
                            }
                        />
                    ) : (
                        <AnimatePresence>
                            {ndrList.map((ndr, i) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={ndr.id}
                                    className="group p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-lg transition-all"
                                >
                                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

                                        {/* Left: Info */}
                                        <div className="flex items-center gap-4 w-full lg:w-auto">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                                                getStatusColor(ndr.status)
                                            )}>
                                                {ndr.attempts}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-[var(--text-primary)]">{ndr.awb}</h4>
                                                    <Badge variant="outline" className="text-[10px] h-5">{ndr.courier}</Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {ndr.sellerName}</span>
                                                    <span>•</span>
                                                    <span>{ndr.customerName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Middle: Reason */}
                                        <div className="flex-1 w-full lg:w-auto text-center lg:text-left">
                                            <div className="inline-block px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                                <p className="text-sm font-medium text-[var(--text-secondary)]">
                                                    <span className="text-[var(--text-muted)] mr-2">Reason:</span>
                                                    {ndr.reason}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right: Status & Action */}
                                        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wide">Last Attempt</p>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{new Date(ndr.lastAttemptDate).toLocaleDateString()}</p>
                                            </div>

                                            {ndr.status === 'action_required' ? (
                                                <Button size="sm" variant="danger" className="min-w-[120px]">
                                                    Fix Now
                                                </Button>
                                            ) : (
                                                <StatusBadge domain="ndr" status={ndr.status} size="sm" className="min-w-[100px] justify-center" />
                                            )}
                                        </div>

                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>

            </div>
        </div>
    );
}
