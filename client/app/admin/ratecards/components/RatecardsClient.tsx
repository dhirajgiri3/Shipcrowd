"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/core/Card';
import { Button } from '@/components/ui/core/Button';
import { Input } from '@/components/ui/core/Input';
import { Badge } from '@/components/ui/core/Badge';
import {
    CreditCard,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    Copy,
    Eye,
    Truck,
    Package,
    TrendingUp,
    CheckCircle,
    XCircle,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/components/ui/feedback/Toast';
import Link from 'next/link';

// Mock rate cards data
const mockRateCards = [
    {
        id: 'RC-001',
        name: 'Delhivery Surface - Lite',
        courier: 'Delhivery',
        courierLogo: '/logos/couriers/delhivery.png',
        service: 'Surface',
        category: 'lite',
        shipmentType: 'forward',
        status: 'active',
        sellersAssigned: 45,
        baseRate: 35,
        additionalRate: 12,
        zones: { zoneA: 35, zoneB: 42, zoneC: 52, zoneD: 65, zoneE: 85 },
        gst: 18,
        codPercent: 2.5,
        codMin: 25,
        createdAt: '2024-11-15',
    },
    {
        id: 'RC-002',
        name: 'Xpressbees Air - Pro',
        courier: 'Xpressbees',
        courierLogo: '/logos/couriers/xpressbees.png',
        service: 'Air',
        category: 'pro',
        shipmentType: 'forward',
        status: 'active',
        sellersAssigned: 28,
        baseRate: 55,
        additionalRate: 18,
        zones: { zoneA: 55, zoneB: 65, zoneC: 78, zoneD: 92, zoneE: 120 },
        gst: 18,
        codPercent: 2.0,
        codMin: 30,
        createdAt: '2024-11-20',
    },
    {
        id: 'RC-003',
        name: 'DTDC Surface - Basic',
        courier: 'DTDC',
        courierLogo: '/logos/couriers/dtdc.png',
        service: 'Surface',
        category: 'basic',
        shipmentType: 'forward',
        status: 'inactive',
        sellersAssigned: 12,
        baseRate: 32,
        additionalRate: 10,
        zones: { zoneA: 32, zoneB: 38, zoneC: 48, zoneD: 58, zoneE: 75 },
        gst: 18,
        codPercent: 2.5,
        codMin: 20,
        createdAt: '2024-10-05',
    },
    {
        id: 'RC-004',
        name: 'Bluedart Express - Enterprise',
        courier: 'Bluedart',
        courierLogo: '/logos/couriers/bluedart.png',
        service: 'Express',
        category: 'enterprise',
        shipmentType: 'forward',
        status: 'active',
        sellersAssigned: 8,
        baseRate: 85,
        additionalRate: 28,
        zones: { zoneA: 85, zoneB: 95, zoneC: 110, zoneD: 125, zoneE: 150 },
        gst: 18,
        codPercent: 1.5,
        codMin: 40,
        createdAt: '2024-12-01',
    },
    {
        id: 'RC-005',
        name: 'Delhivery Surface - Reverse',
        courier: 'Delhivery',
        courierLogo: '/logos/couriers/delhivery.png',
        service: 'Surface',
        category: 'basic',
        shipmentType: 'reverse',
        status: 'active',
        sellersAssigned: 32,
        baseRate: 42,
        additionalRate: 15,
        zones: { zoneA: 42, zoneB: 50, zoneC: 62, zoneD: 75, zoneE: 95 },
        gst: 18,
        codPercent: 0,
        codMin: 0,
        createdAt: '2024-11-25',
    },
];

const categories = ['all', 'lite', 'basic', 'advanced', 'pro', 'enterprise'];
const couriers = ['All Couriers', 'Delhivery', 'Xpressbees', 'DTDC', 'Bluedart', 'Ecom Express'];

export function RatecardsClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedCourier, setSelectedCourier] = useState('All Couriers');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const { addToast } = useToast();

    const filteredRateCards = mockRateCards.filter(card => {
        const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.courier.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || card.category === selectedCategory;
        const matchesCourier = selectedCourier === 'All Couriers' || card.courier === selectedCourier;
        const matchesStatus = selectedStatus === 'all' || card.status === selectedStatus;
        return matchesSearch && matchesCategory && matchesCourier && matchesStatus;
    });

    const getCategoryColor = (category: string) => {
        const colors: Record<string, { bg: string; color: string }> = {
            lite: { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)' },
            basic: { bg: 'var(--info-bg)', color: 'var(--info)' },
            advanced: { bg: 'var(--info-bg)', color: 'var(--info)' },
            pro: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
            enterprise: { bg: 'var(--success-bg)', color: 'var(--success)' },
        };
        return colors[category] || { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
    };

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
                <Link href="/admin/ratecards/create">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Rate Card
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Total Rate Cards</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockRateCards.length}</p>
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
                                    {mockRateCards.filter(c => c.status === 'active').length}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--success-bg)]">
                                <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Sellers Using</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {mockRateCards.reduce((sum, c) => sum + c.sellersAssigned, 0)}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--info-bg)]">
                                <TrendingUp className="h-5 w-5 text-[var(--info)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Couriers</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {new Set(mockRateCards.map(c => c.courier)).size}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--warning-bg)]">
                                <Truck className="h-5 w-5 text-[var(--warning)]" />
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

                        {/* Category Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all capitalize",
                                        selectedCategory === cat
                                            ? "bg-[var(--primary-blue)] text-[var(--text-inverse)]"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Courier Filter */}
                        <select
                            value={selectedCourier}
                            onChange={(e) => setSelectedCourier(e.target.value)}
                            className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
                        >
                            {couriers.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

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
                        key={card.id}
                        className="hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => addToast(`Opening ${card.name}...`, 'info')}
                    >
                        <CardContent className="p-5">
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold text-[var(--text-secondary)]">
                                            {card.courier.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">
                                                {card.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className={cn("text-xs capitalize", getCategoryColor(card.category))}>
                                                    {card.category}
                                                </Badge>
                                                <Badge variant={card.shipmentType === 'forward' ? 'info' : 'warning'} className="text-xs capitalize">
                                                    {card.shipmentType}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant={card.status === 'active' ? 'success' : 'neutral'}>
                                        {card.status}
                                    </Badge>
                                </div>

                                {/* Zone Pricing */}
                                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                                    <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Zone Pricing (₹ per 500g)</p>
                                    <div className="grid grid-cols-5 gap-2 text-center">
                                        {Object.entries(card.zones).map(([zone, price]) => (
                                            <div key={zone}>
                                                <p className="text-xs text-[var(--text-muted)] uppercase">{zone.replace('zone', '')}</p>
                                                <p className="text-sm font-semibold text-[var(--text-primary)]">₹{price}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Info */}
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">Add. Weight</p>
                                        <p className="font-medium text-[var(--text-primary)]">₹{card.additionalRate}/500g</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">COD</p>
                                        <p className="font-medium text-[var(--text-primary)]">{card.codPercent}% / ₹{card.codMin}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">GST</p>
                                        <p className="font-medium text-[var(--text-primary)]">{card.gst}%</p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <Package className="h-3.5 w-3.5" />
                                            {card.sellersAssigned} sellers
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
