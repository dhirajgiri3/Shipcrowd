"use client";

import { useState } from 'react';
import { useDebounce } from '@/src/hooks/utility/useDebounce';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Package,
    Phone,
    RefreshCw,
    X,
    CheckCircle2,
    Clock,
    MapPin,
    Search,
    Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { cn } from '@/src/lib/utils';

// Mock NDR data
const mockNDRs = [
    {
        id: 'NDR001',
        orderId: 'ORD-2024-1234',
        trackingNumber: 'DEL123456789',
        customerName: 'Rahul Sharma',
        customerPhone: '9876543210',
        address: 'Mumbai, Maharashtra - 400001',
        reason: 'Customer not available',
        attempts: 2,
        status: 'pending',
        createdAt: '2024-12-24T10:00:00Z',
        carrier: 'Delhivery',
    },
    {
        id: 'NDR002',
        orderId: 'ORD-2024-1235',
        trackingNumber: 'XPR987654321',
        customerName: 'Priya Patel',
        customerPhone: '9123456789',
        address: 'Delhi - 110001',
        reason: 'Incomplete address',
        attempts: 1,
        status: 'pending',
        createdAt: '2024-12-24T09:30:00Z',
        carrier: 'Xpressbees',
    },
    {
        id: 'NDR003',
        orderId: 'ORD-2024-1236',
        trackingNumber: 'DTC456789123',
        customerName: 'Amit Kumar',
        customerPhone: '9988776655',
        address: 'Bangalore, Karnataka - 560001',
        reason: 'Customer rejected',
        attempts: 3,
        status: 'rto_initiated',
        createdAt: '2024-12-23T15:00:00Z',
        carrier: 'DTDC',
    },
];

const statusStyles = {
    pending: { bg: 'bg-[var(--warning-bg)]', text: 'text-[var(--warning)]', label: 'Pending' },
    reattempt: { bg: 'bg-[var(--info-bg)]', text: 'text-[var(--info)]', label: 'Reattempt Scheduled' },
    rto_initiated: { bg: 'bg-[var(--error-bg)]', text: 'text-[var(--error)]', label: 'RTO Initiated' },
    resolved: { bg: 'bg-[var(--success-bg)]', text: 'text-[var(--success)]', label: 'Resolved' },
};

export function NdrClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [filter, setFilter] = useState<'all' | 'pending' | 'rto_initiated'>('all');

    const filteredNDRs = mockNDRs.filter(ndr => {
        const matchesSearch = ndr.orderId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            ndr.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            ndr.trackingNumber.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchesFilter = filter === 'all' || ndr.status === filter;
        return matchesSearch && matchesFilter;
    });

    const pendingCount = mockNDRs.filter(n => n.status === 'pending').length;
    const rtoCount = mockNDRs.filter(n => n.status === 'rto_initiated').length;

    return (
        <div className="min-h-screen space-y-6 pb-10">
            {/* Header */}
            <header>
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-3xl font-bold text-[var(--text-primary)] tracking-tight"
                >
                    NDR Management
                </motion.h1>
                <p className="text-sm text-[var(--text-secondary)] mt-2">
                    Resolve failed deliveries to prevent RTO charges
                </p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-[var(--warning)]/20 bg-[var(--warning-bg)]">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-[var(--warning)]/10 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-[var(--warning)]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--warning)]">{pendingCount}</p>
                                <p className="text-sm text-[var(--warning)]">Pending NDRs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[var(--error)]/20 bg-[var(--error-bg)]">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-[var(--error)]/10 flex items-center justify-center">
                                <X className="h-6 w-6 text-[var(--error)]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--error)]">{rtoCount}</p>
                                <p className="text-sm text-[var(--error)]">RTO Initiated</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[var(--success)]/20 bg-[var(--success-bg)]">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-[var(--success)]/10 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--success)]">85%</p>
                                <p className="text-sm text-[var(--success)]">Resolution Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-[var(--border-default)]">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                            <Input
                                placeholder="Search by Order ID, Customer, or Tracking..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'pending', 'rto_initiated'] as const).map((f) => (
                                <Button
                                    key={f}
                                    variant={filter === f ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilter(f)}
                                >
                                    {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'RTO'}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* NDR List */}
            <div className="space-y-4">
                {filteredNDRs.length === 0 ? (
                    <Card className="border-[var(--border-default)]">
                        <CardContent className="p-12 text-center">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-[var(--success)]" />
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">No NDRs found</h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                All deliveries are on track!
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredNDRs.map((ndr, index) => {
                        const status = statusStyles[ndr.status as keyof typeof statusStyles];
                        return (
                            <motion.div
                                key={ndr.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="border-[var(--border-default)] hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-bold text-[var(--text-primary)]">{ndr.orderId}</span>
                                                    <Badge className={cn(status.bg, status.text)}>
                                                        {status.label}
                                                    </Badge>
                                                    <span className="text-sm text-[var(--text-muted)]">{ndr.carrier}</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                        <Package className="h-4 w-4 text-[var(--text-muted)]" />
                                                        {ndr.trackingNumber}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                        <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                                                        {ndr.customerName} • {ndr.customerPhone}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                        <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                                                        {ndr.address}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                        <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                                                        {ndr.attempts} attempt(s) • {ndr.reason}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {ndr.status === 'pending' && (
                                                    <>
                                                        <Button variant="outline" size="sm">
                                                            <Phone className="h-4 w-4 mr-1" />
                                                            Contact
                                                        </Button>
                                                        <Button variant="primary" size="sm">
                                                            <RefreshCw className="h-4 w-4 mr-1" />
                                                            Reattempt
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
