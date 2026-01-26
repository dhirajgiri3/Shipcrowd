"use client";
export const dynamic = "force-dynamic";
import { useState } from 'react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { useToast } from '@/src/components/ui/feedback/Toast';
import {
    Truck,
    Search,
    RotateCw,
    AlertCircle,
    CheckCircle,
} from 'lucide-react';
import { useCarriers } from '@/src/core/api/hooks/logistics/useCarriers';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { cn } from '@/src/lib/utils';

export function CouriersClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const { addToast } = useToast();

    // Integration: Fetch real carriers
    const { data: carriers = [], isLoading, isError, error, refetch } = useCarriers();

    // Handle error
    if (isError) {
        // We can check if error has a 'message' property or custom structure
        // Assuming ApiError structure or generic Error
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertCircle className="h-10 w-10 text-[var(--error)] mb-2" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Failed to load carriers</h3>
                <p className="text-[var(--text-secondary)] mb-4">{errorMessage}</p>
                <Button onClick={() => refetch()} variant="outline">Retry</Button>
            </div>
        );
    }

    if (isLoading) {
        return <Loader centered size="lg" message="Loading carriers..." />;
    }

    const filteredCouriers = carriers.filter(carrier => {
        const matchesSearch = carrier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            carrier.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || carrier.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <Truck className="h-6 w-6 text-[var(--primary-blue)]" />
                        Courier Partners
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
                        Manage your shipping partners and configurations
                    </p>
                </div>
                <Button variant="outline" onClick={() => {
                    addToast('Syncing carriers...', 'info');
                    refetch();
                }}>
                    <RotateCw className="h-4 w-4 mr-2" />
                    Sync Partners
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search couriers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                icon={<Search className="h-4 w-4" />}
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'active', 'inactive'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setSelectedStatus(status)}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-full transition-all capitalize",
                                        selectedStatus === status
                                            ? "bg-[var(--primary-blue)] text-[var(--text-inverse)]"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Couriers Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCouriers.map((courier) => (
                    <Card
                        key={courier.id}
                        className="hover:shadow-lg transition-all group cursor-pointer"
                        onClick={() => addToast(`Viewing ${courier.name} details...`, 'info')}
                    >
                        <CardContent className="p-5">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center font-bold text-[var(--text-secondary)]">
                                            {/* Logo placeholder or image logic if available */}
                                            {courier.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[var(--text-primary)]">{courier.name}</h3>
                                            <p className="text-xs text-[var(--text-secondary)] capitalize">{courier.code}</p>
                                        </div>
                                    </div>
                                    <Badge variant={courier.status === 'active' ? 'success' : 'neutral'}>
                                        {courier.status}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                                        <p className="text-xs text-[var(--text-muted)] mb-1">Services</p>
                                        <div className="flex flex-wrap gap-1">
                                            {courier.services.map((s, idx) => (
                                                <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">{s}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                                        <p className="text-xs text-[var(--text-muted)] mb-1">Features</p>
                                        <div className="flex flex-col gap-1 text-xs">
                                            {courier.codEnabled && <span className="flex items-center gap-1 text-[var(--success)]"><CheckCircle className="h-3 w-3" /> COD</span>}
                                            {courier.trackingEnabled && <span className="flex items-center gap-1 text-[var(--info)]"><CheckCircle className="h-3 w-3" /> Tracking</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="text-[var(--text-muted)]">Max Weight</p>
                                        <p className="font-medium text-[var(--text-primary)]">{courier.weightLimit || '-'} kg</p>
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-muted)]">COD Limit</p>
                                        <p className="font-medium text-[var(--text-primary)]">₹{courier.codLimit ? courier.codLimit.toLocaleString() : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredCouriers.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Truck className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No couriers found</h3>
                        <p className="mt-1 text-[var(--text-secondary)]">Try adjusting your search criteria</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
