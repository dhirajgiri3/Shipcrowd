"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/shared/components/card';
import { Button } from '@/src/shared/components/button';
import { Input } from '@/src/shared/components/Input';
import { Badge } from '@/src/shared/components/badge';
import {
    Truck,
    Plus,
    Search,
    Edit2,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Settings,
    Package,
    X,
    CheckCircle,
    AlertCircle,
    Globe,
    Zap
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/src/shared/components/Toast';

// Mock couriers data
const mockCouriers = [
    {
        id: 'COUR-001',
        name: 'Delhivery',
        code: 'delhivery',
        logo: 'DE',
        status: 'active',
        services: ['Surface', 'Express', 'Lite'],
        zones: ['Pan India', 'Metro', 'Tier 2'],
        apiIntegrated: true,
        pickupEnabled: true,
        codEnabled: true,
        trackingEnabled: true,
        totalShipments: 12450,
        avgDeliveryTime: '4.2 days',
        successRate: 94.5,
    },
    {
        id: 'COUR-002',
        name: 'Xpressbees',
        code: 'xpressbees',
        logo: 'XB',
        status: 'active',
        services: ['Surface', 'Express', 'Premium'],
        zones: ['Pan India', 'Metro'],
        apiIntegrated: true,
        pickupEnabled: true,
        codEnabled: true,
        trackingEnabled: true,
        totalShipments: 8920,
        avgDeliveryTime: '3.8 days',
        successRate: 92.8,
    },
    {
        id: 'COUR-003',
        name: 'DTDC',
        code: 'dtdc',
        logo: 'DT',
        status: 'active',
        services: ['Ground', 'Priority', 'Lite'],
        zones: ['Pan India'],
        apiIntegrated: true,
        pickupEnabled: true,
        codEnabled: true,
        trackingEnabled: true,
        totalShipments: 6340,
        avgDeliveryTime: '5.1 days',
        successRate: 89.2,
    },
    {
        id: 'COUR-004',
        name: 'Bluedart',
        code: 'bluedart',
        logo: 'BD',
        status: 'active',
        services: ['Air Express', 'Ground Express', 'Economy'],
        zones: ['Pan India', 'Premium Cities'],
        apiIntegrated: true,
        pickupEnabled: true,
        codEnabled: true,
        trackingEnabled: true,
        totalShipments: 4560,
        avgDeliveryTime: '2.5 days',
        successRate: 96.8,
    },
    {
        id: 'COUR-005',
        name: 'Ecom Express',
        code: 'ecom',
        logo: 'EC',
        status: 'inactive',
        services: ['Surface', 'Express'],
        zones: ['Pan India'],
        apiIntegrated: false,
        pickupEnabled: false,
        codEnabled: true,
        trackingEnabled: true,
        totalShipments: 0,
        avgDeliveryTime: '-',
        successRate: 0,
    },
];

export default function CouriersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const { addToast } = useToast();

    const filteredCouriers = mockCouriers.filter(courier => {
        const matchesSearch = courier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            courier.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || courier.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const toggleCourierStatus = (courierId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        addToast(`Courier ${newStatus === 'active' ? 'activated' : 'deactivated'}!`, 'success');
    };

    const activeCouriers = mockCouriers.filter(c => c.status === 'active').length;
    const totalShipments = mockCouriers.reduce((sum, c) => sum + c.totalShipments, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Truck className="h-6 w-6" style={{ color: 'var(--primary-blue)' }} />
                        Courier Partners
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Manage courier integrations and services
                    </p>
                </div>
                <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Courier
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Couriers</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{mockCouriers.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-blue-soft)' }}>
                                <Truck className="h-5 w-5" style={{ color: 'var(--primary-blue)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{activeCouriers}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--success-bg)' }}>
                                <CheckCircle className="h-5 w-5" style={{ color: 'var(--success)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Shipments</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalShipments.toLocaleString()}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--info-bg)' }}>
                                <Package className="h-5 w-5" style={{ color: 'var(--info)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Delivery Rate</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>93.5%</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--warning-bg)' }}>
                                <Zap className="h-5 w-5" style={{ color: 'var(--warning)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Courier Form */}
            {showAddForm && (
                <Card style={{ borderColor: 'var(--primary-blue-soft)', background: 'var(--bg-primary)' }}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>Add New Courier Partner</CardTitle>
                            <CardDescription style={{ color: 'var(--text-secondary)' }}>Configure a new courier integration</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Courier Name *</label>
                                <Input placeholder="e.g., Delhivery" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Courier Code *</label>
                                <Input placeholder="e.g., delhivery" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Status</label>
                                <select className="flex h-10 w-full rounded-lg border border-gray-200 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-gray-300">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">API Key</label>
                                <Input type="password" placeholder="API Key (if available)" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">API Secret</label>
                                <Input type="password" placeholder="API Secret (if available)" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                                <span className="text-sm text-gray-700">COD Enabled</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                                <span className="text-sm text-gray-700">Pickup Enabled</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                                <span className="text-sm text-gray-700">Tracking Enabled</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded border-gray-300" />
                                <span className="text-sm text-gray-700">API Integrated</span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                            <Button onClick={() => {
                                addToast('Courier added successfully!', 'success');
                                setShowAddForm(false);
                            }}>
                                Add Courier
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
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
                            className="px-4 py-2 text-sm font-medium rounded-full transition-all capitalize"
                            style={{
                                background: selectedStatus === status ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                                color: selectedStatus === status ? 'var(--text-inverse)' : 'var(--text-secondary)'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Couriers Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCouriers.map((courier) => (
                    <Card key={courier.id} className="hover:shadow-lg transition-all">
                        <CardContent className="p-5">
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                            {courier.logo}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{courier.name}</h3>
                                            <code className="text-xs" style={{ color: 'var(--text-secondary)' }}>{courier.code}</code>
                                        </div>
                                    </div>
                                    <Badge variant={courier.status === 'active' ? 'success' : 'neutral'}>
                                        {courier.status}
                                    </Badge>
                                </div>

                                {/* Services */}
                                <div>
                                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Services</p>
                                    <div className="flex flex-wrap gap-1">
                                        {courier.services.map((service) => (
                                            <Badge key={service} variant="outline" className="text-xs">
                                                {service}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Features */}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        {courier.apiIntegrated ? (
                                            <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
                                        ) : (
                                            <AlertCircle className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                                        )}
                                        <span className={courier.apiIntegrated ? 'text-gray-700' : 'text-gray-400'} style={{ color: courier.apiIntegrated ? 'var(--text-primary)' : 'var(--text-muted)' }}>API</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {courier.codEnabled ? (
                                            <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
                                        ) : (
                                            <AlertCircle className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                                        )}
                                        <span className={courier.codEnabled ? 'text-gray-700' : 'text-gray-400'} style={{ color: courier.codEnabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>COD</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {courier.pickupEnabled ? (
                                            <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
                                        ) : (
                                            <AlertCircle className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                                        )}
                                        <span className={courier.pickupEnabled ? 'text-gray-700' : 'text-gray-400'} style={{ color: courier.pickupEnabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>Pickup</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {courier.trackingEnabled ? (
                                            <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
                                        ) : (
                                            <AlertCircle className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                                        )}
                                        <span className={courier.trackingEnabled ? 'text-gray-700' : 'text-gray-400'} style={{ color: courier.trackingEnabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>Tracking</span>
                                    </div>
                                </div>

                                {/* Stats */}
                                {courier.status === 'active' && (
                                    <div className="rounded-lg p-3 grid grid-cols-3 gap-2 text-center" style={{ background: 'var(--bg-secondary)' }}>
                                        <div>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Shipments</p>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{courier.totalShipments.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg. TAT</p>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{courier.avgDeliveryTime}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Success</p>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>{courier.successRate}%</p>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleCourierStatus(courier.id, courier.status)}
                                    >
                                        {courier.status === 'active' ? (
                                            <><ToggleRight className="h-4 w-4 mr-1" style={{ color: 'var(--success)' }} /> Active</>
                                        ) : (
                                            <><ToggleLeft className="h-4 w-4 mr-1" style={{ color: 'var(--text-muted)' }} /> Inactive</>
                                        )}
                                    </Button>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => addToast('Opening settings...', 'info')}>
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => addToast('Opening editor...', 'info')}>
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
            {filteredCouriers.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Truck className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                        <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No couriers found</h3>
                        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or add a new courier</p>
                        <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Courier
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
