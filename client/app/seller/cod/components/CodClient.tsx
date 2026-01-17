"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Banknote,
    Search,
    Download,
    Calendar,
    TrendingUp,
    Clock,
    CheckCircle,
    IndianRupee,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    Eye
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/shared/utils';

// Mock COD remittance data
const mockRemittances = [
    {
        id: 'REM-001',
        date: '2024-12-11',
        totalCOD: 45890,
        deductions: 2500,
        tds: 459,
        netAmount: 42931,
        shipmentCount: 32,
        status: 'processed',
        utr: 'UTR123456789',
    },
    {
        id: 'REM-002',
        date: '2024-12-08',
        totalCOD: 38450,
        deductions: 1800,
        tds: 385,
        netAmount: 36265,
        shipmentCount: 28,
        status: 'processed',
        utr: 'UTR987654321',
    },
    {
        id: 'REM-003',
        date: '2024-12-05',
        totalCOD: 52300,
        deductions: 3200,
        tds: 523,
        netAmount: 48577,
        shipmentCount: 41,
        status: 'processed',
        utr: 'UTR456789123',
    },
    {
        id: 'REM-004',
        date: '2024-12-02',
        totalCOD: 29750,
        deductions: 1500,
        tds: 298,
        netAmount: 27952,
        shipmentCount: 22,
        status: 'processed',
        utr: 'UTR789123456',
    },
    {
        id: 'REM-005',
        date: '2024-12-13',
        totalCOD: 35200,
        deductions: 0,
        tds: 0,
        netAmount: 35200,
        shipmentCount: 26,
        status: 'pending',
        utr: null,
    },
];

// Mock pending COD shipments
const mockPendingCOD = [
    { awb: 'DL987654321IN', amount: 1299, deliveredDate: '2024-12-10', expectedRemit: '2024-12-13' },
    { awb: 'XB123456789IN', amount: 2499, deliveredDate: '2024-12-11', expectedRemit: '2024-12-14' },
    { awb: 'BD555666777IN', amount: 899, deliveredDate: '2024-12-11', expectedRemit: '2024-12-14' },
    { awb: 'DT999888777IN', amount: 1599, deliveredDate: '2024-12-12', expectedRemit: '2024-12-15' },
];

export function CodClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'remittances' | 'pending'>('remittances');
    const { addToast } = useToast();

    const filteredRemittances = mockRemittances.filter(rem =>
        rem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rem.utr?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalCODCollected = mockRemittances.reduce((sum, r) => sum + r.totalCOD, 0);
    const totalRemitted = mockRemittances.filter(r => r.status === 'processed').reduce((sum, r) => sum + r.netAmount, 0);
    const totalPending = mockRemittances.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.netAmount, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Banknote className="h-6 w-6 text-[var(--primary-blue)]" />
                        COD Remittance
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Track your COD collections and bank remittances
                    </p>
                </div>
                <Button variant="outline" onClick={() => addToast('Downloading report...', 'info')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total COD Collected</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(totalCODCollected)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <IndianRupee className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total Remitted</p>
                                <p className="text-2xl font-bold text-[var(--success)]">{formatCurrency(totalRemitted)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Pending Remit</p>
                                <p className="text-2xl font-bold text-[var(--warning)]">{formatCurrency(totalPending)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center">
                                <Clock className="h-5 w-5 text-[var(--warning)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">This Month</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockRemittances.length}</p>
                                <p className="text-xs text-[var(--text-muted)]">remittances</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('remittances')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px",
                        activeTab === 'remittances'
                            ? "border-[var(--primary-blue)] text-[var(--primary-blue)]"
                            : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                >
                    Remittance History
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px flex items-center gap-2",
                        activeTab === 'pending'
                            ? "border-[var(--primary-blue)] text-[var(--primary-blue)]"
                            : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                >
                    Pending COD
                    <Badge variant="warning" className="text-xs">{mockPendingCOD.length}</Badge>
                </button>
            </div>

            {/* Remittance History */}
            {activeTab === 'remittances' && (
                <>
                    {/* Search */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by ID or UTR..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                icon={<Search className="h-4 w-4" />}
                            />
                        </div>
                    </div>

                    {/* Remittances Table */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                        <tr>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                            <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Remit ID</th>
                                            <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Total COD</th>
                                            <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Deductions</th>
                                            <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">TDS</th>
                                            <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Net Amount</th>
                                            <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Shipments</th>
                                            <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                            <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-subtle)]">
                                        {filteredRemittances.map((rem) => (
                                            <tr key={rem.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                                                        <span className="text-sm text-[var(--text-primary)]">{rem.date}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <code className="font-mono text-sm font-semibold text-[var(--text-primary)]">{rem.id}</code>
                                                    {rem.utr && (
                                                        <p className="text-xs text-[var(--text-muted)] mt-1">UTR: {rem.utr}</p>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <p className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(rem.totalCOD)}</p>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <p className="text-sm text-[var(--error)]">-{formatCurrency(rem.deductions)}</p>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <p className="text-sm text-[var(--text-secondary)]">-{formatCurrency(rem.tds)}</p>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <p className="text-sm font-bold text-[var(--success)]">{formatCurrency(rem.netAmount)}</p>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-sm text-[var(--text-primary)]">{rem.shipmentCount}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {rem.status === 'processed' ? (
                                                        <Badge variant="success" className="gap-1">
                                                            <CheckCircle className="h-3 w-3" />
                                                            Processed
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="warning" className="gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => addToast('Opening details...', 'info')}
                                                        >
                                                            <Eye className="h-4 w-4" />
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
                </>
            )}

            {/* Pending COD */}
            {activeTab === 'pending' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pending COD Shipments</CardTitle>
                        <CardDescription>COD amounts waiting to be remitted</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                    <tr>
                                        <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">AWB Number</th>
                                        <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">COD Amount</th>
                                        <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Delivered</th>
                                        <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Expected Remit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {mockPendingCOD.map((item) => (
                                        <tr key={item.awb} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                            <td className="p-4">
                                                <code className="font-mono text-sm font-semibold text-[var(--text-primary)]">{item.awb}</code>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(item.amount)}</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <p className="text-sm text-[var(--text-secondary)]">{item.deliveredDate}</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <Badge variant="info" className="text-xs">{item.expectedRemit}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
                                    <tr>
                                        <td className="p-4 font-medium text-[var(--text-primary)]">Total</td>
                                        <td className="p-4 text-right font-bold text-[var(--text-primary)]">
                                            {formatCurrency(mockPendingCOD.reduce((sum, i) => sum + i.amount, 0))}
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
