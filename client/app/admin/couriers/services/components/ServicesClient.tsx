"use client";

export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import {
    Settings,
    Truck,
    Search,
    Plus,
    Edit2,
    ToggleLeft,
    ToggleRight,
    CheckCircle,
    Zap,
    Clock,
    X,
    Save
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';

// Mock courier services data
const mockCourierServices = [
    {
        id: 'SRV-001',
        courierId: 'COUR-001',
        courierName: 'Delhivery',
        serviceName: 'Surface Express',
        serviceCode: 'DEL_SURFACE',
        serviceType: 'surface',
        isActive: true,
        minWeight: 0,
        maxWeight: 30000,
        zones: ['A', 'B', 'C', 'D', 'E'],
        etaMin: 4,
        etaMax: 6,
        codEnabled: true,
        pickupEnabled: true,
    },
    {
        id: 'SRV-002',
        courierId: 'COUR-001',
        courierName: 'Delhivery',
        serviceName: 'Express Air',
        serviceCode: 'DEL_AIR',
        serviceType: 'air',
        isActive: true,
        minWeight: 0,
        maxWeight: 10000,
        zones: ['A', 'B', 'C'],
        etaMin: 1,
        etaMax: 2,
        codEnabled: true,
        pickupEnabled: true,
    },
    {
        id: 'SRV-003',
        courierId: 'COUR-002',
        courierName: 'Xpressbees',
        serviceName: 'Surface Standard',
        serviceCode: 'XB_SURFACE',
        serviceType: 'surface',
        isActive: true,
        minWeight: 0,
        maxWeight: 25000,
        zones: ['A', 'B', 'C', 'D'],
        etaMin: 3,
        etaMax: 5,
        codEnabled: true,
        pickupEnabled: true,
    },
    {
        id: 'SRV-004',
        courierId: 'COUR-003',
        courierName: 'Bluedart',
        serviceName: 'Dart Apex',
        serviceCode: 'BD_APEX',
        serviceType: 'air',
        isActive: true,
        minWeight: 0,
        maxWeight: 15000,
        zones: ['A', 'B', 'C', 'D', 'E'],
        etaMin: 1,
        etaMax: 2,
        codEnabled: true,
        pickupEnabled: true,
    },
    {
        id: 'SRV-005',
        courierId: 'COUR-004',
        courierName: 'DTDC',
        serviceName: 'Priority',
        serviceCode: 'DTDC_PRIORITY',
        serviceType: 'surface',
        isActive: false,
        minWeight: 0,
        maxWeight: 20000,
        zones: ['A', 'B', 'C'],
        etaMin: 5,
        etaMax: 7,
        codEnabled: false,
        pickupEnabled: true,
    },
];

export function ServicesClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourier, setSelectedCourier] = useState('All');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingService, setEditingService] = useState<typeof mockCourierServices[0] | null>(null);
    const { addToast } = useToast();

    const couriers = ['All', ...new Set(mockCourierServices.map(s => s.courierName))];

    const filteredServices = mockCourierServices.filter(service => {
        const matchesSearch = service.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.serviceCode.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCourier = selectedCourier === 'All' || service.courierName === selectedCourier;
        return matchesSearch && matchesCourier;
    });

    const toggleServiceStatus = (serviceId: string) => {
        addToast('Service status updated!', 'success');
    };

    const activeServices = mockCourierServices.filter(s => s.isActive).length;
    const airServices = mockCourierServices.filter(s => s.serviceType === 'air').length;
    const surfaceServices = mockCourierServices.filter(s => s.serviceType === 'surface').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <Settings className="h-6 w-6 text-[var(--primary-blue)]" />
                        Courier Service Configuration
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
                        Configure and manage individual courier services
                    </p>
                </div>
                <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Total Services</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockCourierServices.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--bg-tertiary)]">
                                <Settings className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Active</p>
                                <p className="text-2xl font-bold text-[var(--success)]">{activeServices}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--bg-success-subtle)]">
                                <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Air Services</p>
                                <p className="text-2xl font-bold text-[var(--info)]">{airServices}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--bg-info-subtle)]">
                                <Zap className="h-5 w-5 text-[var(--info)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Surface Services</p>
                                <p className="text-2xl font-bold text-[var(--warning)]">{surfaceServices}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--bg-warning-subtle)]">
                                <Truck className="h-5 w-5 text-[var(--warning)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Form Modal */}
            {(showAddForm || editingService) && (
                <Card className="border-[var(--primary-blue)]/20 bg-[var(--primary-blue)]/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg">
                                {editingService ? 'Edit Service' : 'Add New Service'}
                            </CardTitle>
                            <CardDescription>Configure courier service details</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => { setShowAddForm(false); setEditingService(null); }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Courier Partner *</label>
                                <select className="flex h-9 w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]">
                                    <option value="">Select Courier</option>
                                    <option value="delhivery">Delhivery</option>
                                    <option value="xpressbees">Xpressbees</option>
                                    <option value="bluedart">Bluedart</option>
                                    <option value="dtdc">DTDC</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Service Name *</label>
                                <Input placeholder="e.g., Surface Express" defaultValue={editingService?.serviceName} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Service Code *</label>
                                <Input placeholder="e.g., DEL_SURFACE" defaultValue={editingService?.serviceCode} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Service Type *</label>
                                <select className="flex h-9 w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]">
                                    <option value="surface">Surface</option>
                                    <option value="air">Air</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Min Weight (g)</label>
                                <Input type="number" placeholder="0" defaultValue={editingService?.minWeight} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Max Weight (g)</label>
                                <Input type="number" placeholder="30000" defaultValue={editingService?.maxWeight} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Status</label>
                                <select className="flex h-9 w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">ETA Min (days)</label>
                                <Input type="number" placeholder="1" defaultValue={editingService?.etaMin} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">ETA Max (days)</label>
                                <Input type="number" placeholder="3" defaultValue={editingService?.etaMax} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Zones</label>
                                <Input placeholder="A, B, C, D, E" defaultValue={editingService?.zones.join(', ')} />
                            </div>
                            <div className="space-y-2 pt-6">
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" className="rounded border-[var(--border-input)]" defaultChecked={editingService?.codEnabled} />
                                        <span className="text-sm text-[var(--text-primary)]">COD</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" className="rounded border-[var(--border-input)]" defaultChecked={editingService?.pickupEnabled} />
                                        <span className="text-sm text-[var(--text-primary)]">Pickup</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            <Button variant="outline" onClick={() => { setShowAddForm(false); setEditingService(null); }}>
                                Cancel
                            </Button>
                            <Button onClick={() => {
                                addToast(editingService ? 'Service updated!' : 'Service added!', 'success');
                                setShowAddForm(false);
                                setEditingService(null);
                            }}>
                                <Save className="h-4 w-4 mr-2" />
                                {editingService ? 'Update' : 'Add'} Service
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search services..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search className="h-4 w-4" />}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    {couriers.map((courier) => (
                        <button
                            key={courier}
                            onClick={() => setSelectedCourier(courier)}
                            className="px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap"
                            style={{
                                background: selectedCourier === courier ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                                color: selectedCourier === courier ? 'var(--text-inverse)' : 'var(--text-secondary)'
                            }}
                        >
                            {courier}
                        </button>
                    ))}
                </div>
            </div>

            {/* Services Table */}
            {filteredServices.length === 0 ? (
                <EmptyState
                    icon={<Settings className="w-12 h-12" />}
                    title="No services found"
                    description="Try adjusting your search or add a new service"
                    action={{
                        label: 'Add Service',
                        onClick: () => setShowAddForm(true),
                        variant: 'primary',
                        icon: <Plus className="w-4 h-4" />
                    }}
                />
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                                    <tr>
                                        <th className="text-left p-4 text-xs font-medium uppercase text-[var(--text-secondary)]">Service</th>
                                        <th className="text-left p-4 text-xs font-medium uppercase text-[var(--text-secondary)]">Courier</th>
                                        <th className="text-center p-4 text-xs font-medium uppercase text-[var(--text-secondary)]">Type</th>
                                        <th className="text-center p-4 text-xs font-medium uppercase text-[var(--text-secondary)]">Weight Range</th>
                                        <th className="text-center p-4 text-xs font-medium uppercase text-[var(--text-secondary)]">ETA</th>
                                        <th className="text-center p-4 text-xs font-medium uppercase text-[var(--text-secondary)]">Features</th>
                                        <th className="text-center p-4 text-xs font-medium uppercase text-[var(--text-secondary)]">Status</th>
                                        <th className="text-right p-4 text-xs font-medium uppercase text-[var(--text-secondary)]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {filteredServices.map((service) => (
                                        <tr key={service.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                            <td className="p-4">
                                                <p className="font-semibold text-[var(--text-primary)]">{service.serviceName}</p>
                                                <code className="text-xs text-[var(--text-secondary)]">{service.serviceCode}</code>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm text-[var(--text-primary)]">{service.courierName}</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <Badge variant={service.serviceType === 'air' ? 'info' : 'warning'}>
                                                    {service.serviceType === 'air' ? <Zap className="h-3 w-3 mr-1" /> : <Truck className="h-3 w-3 mr-1" />}
                                                    {service.serviceType}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-center">
                                                <p className="text-sm text-[var(--text-primary)]">{service.minWeight}g - {(service.maxWeight / 1000).toFixed(0)}kg</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                    <span className="text-sm text-[var(--text-primary)]">{service.etaMin}-{service.etaMax} days</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {service.codEnabled && (
                                                        <Badge variant="outline" className="text-xs">COD</Badge>
                                                    )}
                                                    {service.pickupEnabled && (
                                                        <Badge variant="outline" className="text-xs">Pickup</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <StatusBadge
                                                    domain="courier"
                                                    status={service.isActive ? 'active' : 'inactive'}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleServiceStatus(service.id)}
                                                    >
                                                        {service.isActive ? (
                                                            <ToggleRight className="h-4 w-4 text-[var(--success)]" />
                                                        ) : (
                                                            <ToggleLeft className="h-4 w-4 text-[var(--text-muted)]" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditingService(service)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
