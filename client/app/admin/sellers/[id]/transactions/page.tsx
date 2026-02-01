'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { ChevronLeft, Search, Download, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api';

interface Transaction {
    _id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    category: string;
    balanceAfter: number;
    createdAt: string;
    reference?: string;
}

export default function SellerTransactionsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'sellers', params.id, 'transactions', { search, type: typeFilter, page }],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            if (search) queryParams.append('search', search);
            if (typeFilter !== 'all') queryParams.append('type', typeFilter);
            queryParams.append('page', String(page));
            queryParams.append('limit', '50');

            const response = await apiClient.get(
                `/admin/sellers/${params.id}/transactions?${queryParams.toString()}`
            );
            return response.data;
        },
    });

    const handleExport = () => {
        window.open(
            `/api/admin/sellers/${params.id}/transactions/export?type=${typeFilter}`,
            '_blank'
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/sellers/${params.id}`)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Financial Transactions</h1>
                        <p className="text-muted-foreground mt-1">All transactions for this seller</p>
                    </div>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Credits</CardDescription>
                        <CardTitle className="text-2xl text-green-600 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            ₹{data?.summary?.totalCredits?.toLocaleString() || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Debits</CardDescription>
                        <CardTitle className="text-2xl text-red-600 flex items-center gap-2">
                            <TrendingDown className="h-5 w-5" />
                            ₹{data?.summary?.totalDebits?.toLocaleString() || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Current Balance</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            ₹{data?.summary?.currentBalance?.toLocaleString() || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search transactions..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="w-full md:w-[200px]">
                            <select
                                className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="all">All Types</option>
                                <option value="CREDIT">Credits Only</option>
                                <option value="DEBIT">Debits Only</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>
                        {data?.pagination?.total || 0} total transactions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading transactions...</div>
                    ) : !data?.data?.length ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No transactions found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b">
                                        <tr className="text-left text-sm text-muted-foreground">
                                            <th className="pb-3 font-medium">Date</th>
                                            <th className="pb-3 font-medium">Type</th>
                                            <th className="pb-3 font-medium">Description</th>
                                            <th className="pb-3 font-medium">Category</th>
                                            <th className="pb-3 font-medium text-right">Amount</th>
                                            <th className="pb-3 font-medium text-right">Balance After</th>
                                            <th className="pb-3 font-medium">Reference</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.data.map((txn: Transaction) => (
                                            <tr key={txn._id} className="text-sm">
                                                <td className="py-4">
                                                    {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </td>
                                                <td className="py-4">
                                                    <Badge variant={txn.type === 'CREDIT' ? 'primary' : 'error'}>
                                                        {txn.type}
                                                    </Badge>
                                                </td>
                                                <td className="py-4">{txn.description}</td>
                                                <td className="py-4">
                                                    <Badge variant="outline">{txn.category}</Badge>
                                                </td>
                                                <td className={`py-4 text-right font-medium ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                                                </td>
                                                <td className="py-4 text-right font-mono">
                                                    ₹{txn.balanceAfter.toLocaleString()}
                                                </td>
                                                <td className="py-4 font-mono text-xs text-muted-foreground">
                                                    {txn.reference || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {data.pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Page {data.pagination.page} of {data.pagination.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === 1}
                                            onClick={() => setPage((p) => p - 1)}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === data.pagination.totalPages}
                                            onClick={() => setPage((p) => p + 1)}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
