"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    Ticket,
    Plus,
    Search,
    Copy,
    Edit2,
    Trash2,
    Calendar,
    Users,
    IndianRupee,
    Percent,
    X,
    CheckCircle,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';

// Mock coupons data
const mockCoupons = [
    {
        id: 'COUP-001',
        code: 'NEWUSER50',
        type: 'percentage',
        value: 50,
        maxDiscount: 500,
        minRecharge: 1000,
        usageLimit: 100,
        usedCount: 45,
        validFrom: '2024-12-01',
        validTo: '2024-12-31',
        status: 'active',
        description: 'New user signup bonus',
    },
    {
        id: 'COUP-002',
        code: 'FLAT200',
        type: 'fixed',
        value: 200,
        maxDiscount: null,
        minRecharge: 2000,
        usageLimit: 50,
        usedCount: 50,
        validFrom: '2024-11-15',
        validTo: '2024-11-30',
        status: 'expired',
        description: 'Flat ₹200 off on recharge',
    },
    {
        id: 'COUP-003',
        code: 'DIWALI25',
        type: 'percentage',
        value: 25,
        maxDiscount: 1000,
        minRecharge: 5000,
        usageLimit: 200,
        usedCount: 156,
        validFrom: '2024-10-25',
        validTo: '2024-11-15',
        status: 'expired',
        description: 'Diwali special offer',
    },
    {
        id: 'COUP-004',
        code: 'WELCOME100',
        type: 'fixed',
        value: 100,
        maxDiscount: null,
        minRecharge: 500,
        usageLimit: null,
        usedCount: 892,
        validFrom: '2024-01-01',
        validTo: '2024-12-31',
        status: 'active',
        description: 'Welcome bonus for all users',
    },
];

export default function CouponsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'expired'>('all');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const { addToast } = useToast();

    const filteredCoupons = mockCoupons.filter(coupon => {
        const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            coupon.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || coupon.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        addToast(`Copied: ${code}`, 'success');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Ticket className="h-6 w-6" style={{ color: 'var(--primary-blue)' }} />
                        Coupons & Promotions
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Manage discount codes for wallet recharges
                    </p>
                </div>
                <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Coupons</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{mockCoupons.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-blue-soft)' }}>
                                <Ticket className="h-5 w-5" style={{ color: 'var(--primary-blue)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
                                    {mockCoupons.filter(c => c.status === 'active').length}
                                </p>
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
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Redemptions</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {mockCoupons.reduce((sum, c) => sum + c.usedCount, 0)}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--info-bg)' }}>
                                <Users className="h-5 w-5" style={{ color: 'var(--info)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Est. Discount Given</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>₹45.2K</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--warning-bg)' }}>
                                <IndianRupee className="h-5 w-5" style={{ color: 'var(--warning)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Create Coupon Form */}
            {showCreateForm && (
                <Card className="border-[#2525FF]/20 bg-[#2525FF]/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Create New Coupon</CardTitle>
                            <CardDescription>Set up a new discount code</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Coupon Code *</label>
                                <Input placeholder="e.g., SAVE50" className="uppercase" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Discount Type *</label>
                                <select className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-300">
                                    <option value="percentage">Percentage</option>
                                    <option value="fixed">Fixed Amount</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Discount Value *</label>
                                <Input type="number" placeholder="e.g., 50" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Max Discount (₹)</label>
                                <Input type="number" placeholder="e.g., 500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Min Recharge (₹) *</label>
                                <Input type="number" placeholder="e.g., 1000" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Usage Limit</label>
                                <Input type="number" placeholder="Unlimited if empty" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Valid From *</label>
                                <Input type="date" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Valid To *</label>
                                <Input type="date" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Description</label>
                            <Input placeholder="Brief description of the coupon" />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                            <Button onClick={() => {
                                addToast('Coupon created successfully!', 'success');
                                setShowCreateForm(false);
                            }}>
                                Create Coupon
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search coupons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search className="h-4 w-4" />}
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'active', 'expired'] as const).map((status) => (
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

            {/* Coupons Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Code</th>
                                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Discount</th>
                                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Min Recharge</th>
                                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Usage</th>
                                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Validity</th>
                                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCoupons.map((coupon) => (
                                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono font-semibold text-gray-900">
                                                    {coupon.code}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(coupon.code)}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    <Copy className="h-3.5 w-3.5 text-gray-400" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                {coupon.type === 'percentage' ? (
                                                    <>
                                                        <Percent className="h-4 w-4 text-[#2525FF]" />
                                                        <span className="font-medium text-gray-900">{coupon.value}%</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <IndianRupee className="h-4 w-4 text-[#2525FF]" />
                                                        <span className="font-medium text-gray-900">{coupon.value}</span>
                                                    </>
                                                )}
                                            </div>
                                            {coupon.maxDiscount && (
                                                <p className="text-xs text-gray-500">Max: ₹{coupon.maxDiscount}</p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-medium text-gray-900">{formatCurrency(coupon.minRecharge)}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-900">{coupon.usedCount}</span>
                                                {coupon.usageLimit && (
                                                    <span className="text-gray-400">/ {coupon.usageLimit}</span>
                                                )}
                                            </div>
                                            {coupon.usageLimit && (
                                                <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                                                    <div
                                                        className="h-full bg-[#2525FF] rounded-full"
                                                        style={{ width: `${Math.min((coupon.usedCount / coupon.usageLimit) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 text-sm text-gray-900">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span>{coupon.validFrom}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">to {coupon.validTo}</p>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={coupon.status === 'active' ? 'success' : 'neutral'}>
                                                {coupon.status === 'active' ? (
                                                    <><CheckCircle className="h-3 w-3 mr-1" />Active</>
                                                ) : (
                                                    <><Clock className="h-3 w-3 mr-1" />Expired</>
                                                )}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => addToast('Opening editor...', 'info')}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                    onClick={() => addToast('Coupon deleted!', 'success')}
                                                >
                                                    <Trash2 className="h-4 w-4" />
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

            {/* Empty State */}
            {filteredCoupons.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Ticket className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                        <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No coupons found</h3>
                        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or create a new coupon</p>
                        <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Coupon
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
