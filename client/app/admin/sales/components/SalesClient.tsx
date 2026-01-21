"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Users,
    Search,
    Plus,
    TrendingUp,
    IndianRupee,
    Building2,
    Target,
    Award,
    Phone,
    Mail,
    Star,
    Eye,
    Edit2,
    ToggleLeft,
    ToggleRight,
    UserPlus,
    X,
    Save
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/lib/utils';

// Mock salesperson data
const mockSalespeople = [
    {
        id: 'SP-001',
        name: 'Rahul Verma',
        email: 'rahul.verma@Helix.com',
        phone: '+91 98765 43210',
        status: 'active',
        sellersOnboarded: 24,
        monthlyTarget: 500000,
        monthlyAchieved: 485000,
        totalRevenue: 2450000,
        commission: 45000,
        rating: 4.8,
        joinedAt: '2024-01-15',
    },
    {
        id: 'SP-002',
        name: 'Priya Sharma',
        email: 'priya.sharma@Helix.com',
        phone: '+91 87654 32109',
        status: 'active',
        sellersOnboarded: 18,
        monthlyTarget: 400000,
        monthlyAchieved: 420000,
        totalRevenue: 1890000,
        commission: 38000,
        rating: 4.9,
        joinedAt: '2024-02-20',
    },
    {
        id: 'SP-003',
        name: 'Amit Kumar',
        email: 'amit.kumar@Helix.com',
        phone: '+91 76543 21098',
        status: 'active',
        sellersOnboarded: 15,
        monthlyTarget: 350000,
        monthlyAchieved: 280000,
        totalRevenue: 1250000,
        commission: 28000,
        rating: 4.2,
        joinedAt: '2024-03-10',
    },
    {
        id: 'SP-004',
        name: 'Sneha Patel',
        email: 'sneha.patel@Helix.com',
        phone: '+91 65432 10987',
        status: 'inactive',
        sellersOnboarded: 8,
        monthlyTarget: 300000,
        monthlyAchieved: 0,
        totalRevenue: 680000,
        commission: 12000,
        rating: 4.0,
        joinedAt: '2024-04-05',
    },
];

export function SalesClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const { addToast } = useToast();

    const filteredSalespeople = mockSalespeople.filter(sp =>
        sp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sp.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleStatus = (id: string) => {
        addToast('Status updated!', 'success');
    };

    const totalSellers = mockSalespeople.reduce((sum, sp) => sum + sp.sellersOnboarded, 0);
    const totalRevenue = mockSalespeople.reduce((sum, sp) => sum + sp.totalRevenue, 0);
    const totalTarget = mockSalespeople.filter(sp => sp.status === 'active').reduce((sum, sp) => sum + sp.monthlyTarget, 0);
    const totalAchieved = mockSalespeople.filter(sp => sp.status === 'active').reduce((sum, sp) => sum + sp.monthlyAchieved, 0);
    const achievementRate = Math.round((totalAchieved / totalTarget) * 100);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Users className="h-6 w-6 text-[var(--primary-blue)]" />
                        Sales Team Management
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Manage sales representatives and track performance
                    </p>
                </div>
                <Button onClick={() => setShowAddForm(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Salesperson
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total Team</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockSalespeople.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <Users className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Sellers Onboarded</p>
                                <p className="text-2xl font-bold text-[var(--success)]">{totalSellers}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total Revenue</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(totalRevenue)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
                                <IndianRupee className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Monthly Target</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(totalTarget)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center">
                                <Target className="h-5 w-5 text-[var(--warning)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Achievement</p>
                                <p className={cn("text-2xl font-bold", achievementRate >= 100 ? "text-[var(--success)]" : "text-[var(--warning)]")}>{achievementRate}%</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <Card className="border-[var(--primary-blue)]/20 bg-[var(--primary-blue-soft)]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Add New Salesperson</CardTitle>
                            <CardDescription>Enter details to add a new sales representative</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Full Name *</label>
                                <Input placeholder="Enter name" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Email *</label>
                                <Input type="email" placeholder="email@Helix.com" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Phone *</label>
                                <Input placeholder="+91 98765 43210" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Monthly Target (₹)</label>
                                <Input type="number" placeholder="e.g., 300000" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Commission Rate (%)</label>
                                <Input type="number" placeholder="e.g., 5" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                            <Button onClick={() => {
                                addToast('Salesperson added successfully!', 'success');
                                setShowAddForm(false);
                            }}>
                                <Save className="h-4 w-4 mr-2" />
                                Add Salesperson
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search className="h-4 w-4" />}
                    />
                </div>
            </div>

            {/* Sales Team Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {filteredSalespeople.map((sp) => {
                    const targetProgress = Math.round((sp.monthlyAchieved / sp.monthlyTarget) * 100);
                    return (
                        <Card key={sp.id} className={cn("transition-all", sp.status === 'inactive' && "opacity-60")}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] font-semibold text-lg">
                                            {sp.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[var(--text-primary)]">{sp.name}</h3>
                                            <p className="text-sm text-[var(--text-muted)]">{sp.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={sp.status === 'active' ? 'success' : 'neutral'}>
                                            {sp.status}
                                        </Badge>
                                        <button onClick={() => toggleStatus(sp.id)}>
                                            {sp.status === 'active' ? (
                                                <ToggleRight className="h-5 w-5 text-[var(--success)]" />
                                            ) : (
                                                <ToggleLeft className="h-5 w-5 text-[var(--text-disabled)]" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                                        {sp.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                                        {sp.phone}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl mb-4">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-[var(--text-primary)]">{sp.sellersOnboarded}</p>
                                        <p className="text-xs text-[var(--text-muted)]">Sellers</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(sp.totalRevenue)}</p>
                                        <p className="text-xs text-[var(--text-muted)]">Revenue</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Star className="h-4 w-4 text-[var(--warning)]" />
                                            <p className="text-xl font-bold text-[var(--text-primary)]">{sp.rating}</p>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">Rating</p>
                                    </div>
                                </div>

                                {/* Target Progress */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-muted)]">Monthly Target</span>
                                        <span className={cn("font-semibold", targetProgress >= 100 ? "text-[var(--success)]" : "text-[var(--text-primary)]")}>
                                            {targetProgress}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                targetProgress >= 100 ? "bg-[var(--success)]" : targetProgress >= 70 ? "bg-[var(--warning)]" : "bg-[var(--error)]"
                                            )}
                                            style={{ width: `${Math.min(targetProgress, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {formatCurrency(sp.monthlyAchieved)} / {formatCurrency(sp.monthlyTarget)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredSalespeople.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 text-[var(--text-disabled)] mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No salespeople found</h3>
                        <p className="text-[var(--text-muted)] mt-1">Try adjusting your search</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
