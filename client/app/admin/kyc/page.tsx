"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    Shield,
    Search,
    Users,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Download,
    Eye,
    FileText,
    TrendingUp,
    Calendar,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

// Mock KYC data
const mockKYCData = [
    {
        id: 'SLR-001',
        name: 'TechGadgets Inc.',
        owner: 'Rahul Sharma',
        email: 'rahul@techgadgets.com',
        status: 'verified',
        submittedAt: '2024-11-15',
        verifiedAt: '2024-11-17',
        documents: ['Pan Card', 'GST Certificate', 'Bank Statement'],
    },
    {
        id: 'SLR-002',
        name: 'Fashion Hub',
        owner: 'Priya Patel',
        email: 'priya@fashionhub.in',
        status: 'pending',
        submittedAt: '2024-12-10',
        verifiedAt: null,
        documents: ['Pan Card', 'GST Certificate'],
        pendingDocs: ['Bank Statement'],
    },
    {
        id: 'SLR-003',
        name: 'HomeDecor Plus',
        owner: 'Amit Singh',
        email: 'amit@homedecorplus.com',
        status: 'verified',
        submittedAt: '2024-10-20',
        verifiedAt: '2024-10-22',
        documents: ['Pan Card', 'GST Certificate', 'Bank Statement', 'Address Proof'],
    },
    {
        id: 'SLR-004',
        name: 'StartupStore',
        owner: 'Kavita Reddy',
        email: 'kavita@startupstore.in',
        status: 'incomplete',
        submittedAt: null,
        verifiedAt: null,
        documents: ['Pan Card'],
        pendingDocs: ['GST Certificate', 'Bank Statement'],
    },
    {
        id: 'SLR-005',
        name: 'BookWorld',
        owner: 'Vikram Iyer',
        email: 'vikram@bookworld.com',
        status: 'rejected',
        submittedAt: '2024-12-05',
        verifiedAt: null,
        documents: ['Pan Card', 'GST Certificate'],
        rejectionReason: 'GST certificate expired',
    },
    {
        id: 'SLR-006',
        name: 'SportsZone',
        owner: 'Neha Gupta',
        email: 'neha@sportszone.in',
        status: 'pending',
        submittedAt: '2024-12-12',
        verifiedAt: null,
        documents: ['Pan Card', 'GST Certificate', 'Bank Statement'],
    },
];

const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'verified', label: 'Verified' },
    { id: 'pending', label: 'Pending Review' },
    { id: 'incomplete', label: 'Incomplete' },
    { id: 'rejected', label: 'Rejected' },
];

export default function KYCAnalyticsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const { addToast } = useToast();

    const filteredData = mockKYCData.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Verified</Badge>;
            case 'pending':
                return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
            case 'incomplete':
                return <Badge variant="info" className="gap-1"><AlertTriangle className="h-3 w-3" />Incomplete</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    const handleApprove = (id: string) => {
        addToast('KYC approved successfully!', 'success');
    };

    const handleReject = (id: string) => {
        addToast('KYC rejected. Seller notified.', 'info');
    };

    const stats = {
        total: mockKYCData.length,
        verified: mockKYCData.filter(k => k.status === 'verified').length,
        pending: mockKYCData.filter(k => k.status === 'pending').length,
        incomplete: mockKYCData.filter(k => k.status === 'incomplete').length,
        rejected: mockKYCData.filter(k => k.status === 'rejected').length,
    };

    const verificationRate = Math.round((stats.verified / stats.total) * 100);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Shield className="h-6 w-6" style={{ color: 'var(--primary-blue)' }} />
                        Seller KYC Analytics
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Monitor and manage seller verification status
                    </p>
                </div>
                <Button variant="outline" onClick={() => addToast('Exporting report...', 'info')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Sellers</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-blue-soft)' }}>
                                <Users className="h-5 w-5" style={{ color: 'var(--primary-blue)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Verified</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{stats.verified}</p>
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
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pending</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{stats.pending}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--warning-bg)' }}>
                                <Clock className="h-5 w-5" style={{ color: 'var(--warning)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Incomplete</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--info)' }}>{stats.incomplete}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--info-bg)' }}>
                                <AlertTriangle className="h-5 w-5" style={{ color: 'var(--info)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Verification Rate</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{verificationRate}%</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--info-bg)' }}>
                                <TrendingUp className="h-5 w-5" style={{ color: 'var(--info)' }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by seller name, owner, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search className="h-4 w-4" />}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setSelectedStatus(filter.id)}
                            className="px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap"
                            style={{
                                background: selectedStatus === filter.id ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                                color: selectedStatus === filter.id ? 'var(--text-inverse)' : 'var(--text-secondary)'
                            }}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KYC Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-secondary)] border-b border-gray-100">
                                <tr>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Seller</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Documents</th>
                                    <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Submitted</th>
                                    <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                        <td className="p-4">
                                            <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                                            <p className="text-sm text-[var(--text-muted)]">{item.owner} • {item.email}</p>
                                            <code className="text-xs text-gray-400">{item.id}</code>
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(item.status)}
                                            {item.rejectionReason && (
                                                <p className="text-xs text-rose-600 mt-1">{item.rejectionReason}</p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {item.documents.map((doc, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        {doc}
                                                    </Badge>
                                                ))}
                                            </div>
                                            {item.pendingDocs && item.pendingDocs.length > 0 && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    Missing: {item.pendingDocs.join(', ')}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {item.submittedAt ? (
                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {item.submittedAt}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">Not submitted</span>
                                            )}
                                            {item.verifiedAt && (
                                                <p className="text-xs text-emerald-600 mt-1">
                                                    Verified on {item.verifiedAt}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                {item.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                            onClick={() => handleApprove(item.id)}
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                                            onClick={() => handleReject(item.id)}
                                                        >
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
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

            {/* Empty State */}
            {filteredData.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Shield className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                        <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No KYC records found</h3>
                        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or filters</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
