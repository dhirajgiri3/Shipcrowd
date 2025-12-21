"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MOCK_WAREHOUSES, MOCK_INVENTORY } from '@/lib/mockData';
import { Warehouse, MapPin, Package, Plus, AlertCircle } from 'lucide-react';

export default function WarehousesPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Warehouse className="h-6 w-6 text-indigo-600" />
                        Warehouse Management
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Manage fulfillment centers and inventory</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" /> Add Warehouse
                </Button>
            </div>

            {/* 1. Warehouse List */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {MOCK_WAREHOUSES.map((wh) => (
                    <Card key={wh.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Warehouse className="h-6 w-6 text-indigo-600" />
                                </div>
                                <Badge variant={wh.status === 'Active' ? 'success' : 'neutral'}>
                                    {wh.status}
                                </Badge>
                            </div>
                            <CardTitle className="text-lg mt-3">{wh.name}</CardTitle>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {wh.location}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500">Utilization</span>
                                        <span className="font-medium text-gray-900">{Math.round((wh.utilized / wh.capacity) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${(wh.utilized / wh.capacity) > 0.9 ? 'bg-red-500' :
                                                (wh.utilized / wh.capacity) > 0.7 ? 'bg-amber-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${(wh.utilized / wh.capacity) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs mt-1 text-gray-400">
                                        <span>{wh.utilized.toLocaleString()} units</span>
                                        <span>Capacity: {wh.capacity.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-gray-100 flex gap-2">
                                    <Button variant="outline" size="sm" className="w-full text-xs">View Inventory</Button>
                                    <Button variant="ghost" size="sm" className="w-8 px-0"><SettingsIcon /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 2. Inventory Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-gray-600" />
                        Inventory Snapshot
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--bg-secondary)] border-b border-gray-100 text-[var(--text-muted)]">
                                <tr>
                                    <th className="px-6 py-3 font-medium">SKU</th>
                                    <th className="px-6 py-3 font-medium">Product Name</th>
                                    <th className="px-6 py-3 font-medium">Warehouse</th>
                                    <th className="px-6 py-3 font-medium">Quantity</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {MOCK_INVENTORY.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-[var(--bg-secondary)]">
                                        <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{item.sku}</td>
                                        <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{item.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.warehouse}</td>
                                        <td className="px-6 py-4 font-medium">{item.quantity} units</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                item.status === 'In Stock' ? 'success' :
                                                    item.status === 'Low Stock' ? 'warning' : 'neutral'
                                            }>
                                                {item.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="ghost" className="h-8 text-indigo-600 hover:text-indigo-700">Refill</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function SettingsIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
    )
}
