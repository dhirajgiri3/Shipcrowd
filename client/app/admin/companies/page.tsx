"use client";

import { useMemo, useState } from 'react';
import { MOCK_COMPANIES } from '@/lib/mockData';
import { DataTable } from '@/src/shared/components/DataTable';
import { Card, CardHeader, CardContent } from '@/src/shared/components/card';
import { Button } from '@/src/shared/components/button';
import { Input } from '@/src/shared/components/Input';
import { Search, Plus, MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { formatCurrency } from '@/src/shared/utils';
import { Company } from '@/types/admin';

export default function CompaniesPage() {
    const [search, setSearch] = useState('');

    const filteredData = useMemo(() => {
        return MOCK_COMPANIES.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.id.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    const columns: {
        header: string;
        accessorKey: keyof Company | string;
        cell?: (row: Company) => React.ReactNode;
        width?: string;
    }[] = [
            { header: 'Company Name', accessorKey: 'name', cell: (row: Company) => <span className="font-semibold text-gray-900">{row.name}</span> },
            { header: 'Tier', accessorKey: 'tier', cell: (row: Company) => <StatusBadge status={row.tier} /> },
            { header: 'Wallet Balance', accessorKey: 'walletBalance', cell: (row: Company) => formatCurrency(row.walletBalance) },
            { header: 'Active Users', accessorKey: 'activeUsers' },
            { header: 'Total Orders', accessorKey: 'totalOrders' },
            { header: 'Status', accessorKey: 'status', cell: (row: Company) => <StatusBadge status={row.status} /> },
            {
                header: 'Actions',
                accessorKey: 'id',
                width: 'w-10',
                cell: (_row: Company) => (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                )
            }
        ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Companies</h2>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <Input
                        placeholder="Search companies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search className="h-4 w-4" />}
                        className="max-w-md"
                    />
                </CardHeader>
                <CardContent>
                    <DataTable columns={columns} data={filteredData} />
                </CardContent>
            </Card>
        </div>
    );
}
