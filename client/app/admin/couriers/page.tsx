"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

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
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="h-6 w-6 text-[#2525FF]" />
                        Courier Partners
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
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
                                <p className="text-sm text-gray-500">Total Couriers</p>
                                <p className="text-2xl font-bold text-gray-900">{mockCouriers.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[#2525FF]/10 flex items-center justify-center">
                                <Truck className="h-5 w-5 text-[#2525FF]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Active</p>
                                <p className="text-2xl font-bold text-emerald-600">{activeCouriers}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Shipments</p>
                                <p className="text-2xl font-bold text-gray-900">{totalShipments.toLocaleString()}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Package className="h-5 w-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Avg. Delivery Rate</p>
                                <p className="text-2xl font-bold text-gray-900">93.5%</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Zap className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Courier Form */}
            {showAddForm && (
                <Card className="border-[#2525FF]/20 bg-[#2525FF]/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Add New Courier Partner</CardTitle>
                            <CardDescription>Configure a new courier integration</CardDescription>
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
                                <select className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-300">
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
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-full transition-all capitalize",
                                selectedStatus === status
                                    ? "bg-[#2525FF] text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
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
                                        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">
                                            {courier.logo}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{courier.name}</h3>
                                            <code className="text-xs text-gray-500">{courier.code}</code>
                                        </div>
                                    </div>
                                    <Badge variant={courier.status === 'active' ? 'success' : 'neutral'}>
                                        {courier.status}
                                    </Badge>
                                </div>

                                {/* Services */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Services</p>
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
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-gray-300" />
                                        )}
                                        <span className={courier.apiIntegrated ? 'text-gray-700' : 'text-gray-400'}>API</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {courier.codEnabled ? (
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-gray-300" />
                                        )}
                                        <span className={courier.codEnabled ? 'text-gray-700' : 'text-gray-400'}>COD</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {courier.pickupEnabled ? (
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-gray-300" />
                                        )}
                                        <span className={courier.pickupEnabled ? 'text-gray-700' : 'text-gray-400'}>Pickup</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {courier.trackingEnabled ? (
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-gray-300" />
                                        )}
                                        <span className={courier.trackingEnabled ? 'text-gray-700' : 'text-gray-400'}>Tracking</span>
                                    </div>
                                </div>

                                {/* Stats */}
                                {courier.status === 'active' && (
                                    <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-gray-400">Shipments</p>
                                            <p className="text-sm font-semibold text-gray-900">{courier.totalShipments.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Avg. TAT</p>
                                            <p className="text-sm font-semibold text-gray-900">{courier.avgDeliveryTime}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Success</p>
                                            <p className="text-sm font-semibold text-emerald-600">{courier.successRate}%</p>
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
                                            <><ToggleRight className="h-4 w-4 mr-1 text-emerald-500" /> Active</>
                                        ) : (
                                            <><ToggleLeft className="h-4 w-4 mr-1 text-gray-400" /> Inactive</>
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
                        <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No couriers found</h3>
                        <p className="text-gray-500 mt-1">Try adjusting your search or add a new courier</p>
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
