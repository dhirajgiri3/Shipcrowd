"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUserDetails, useImpersonateUser } from '@/src/core/api/hooks/admin/useUserManagement';
import {
    ArrowLeft,
    User,
    Building2,
    Mail,
    Calendar,
    Shield,
    MapPin,
    Phone,
    LogIn,
    Ban,
    AlertTriangle,
    CheckCircle2,
    Truck,
    Wallet,
    BarChart3,
    AlertCircle,
    Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { HealthGauge } from '@/src/components/ui/visualizations/HealthGauge';
import { SuspendUserModal } from '../../sellers/components/SuspendUserModal';
import { UnsuspendUserModal } from '../../sellers/components/UnsuspendUserModal';
import { formatCurrency } from '@/src/lib/utils';
import { Loader } from '@/src/components/ui/feedback/Loader';

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    // Hooks
    const { data: userData, isLoading, error, refetch } = useUserDetails(id as string);
    const { mutate: impersonate, isPending: isImpersonating } = useImpersonateUser();

    // State
    const [suspendModalOpen, setSuspendModalOpen] = useState(false);
    const [unsuspendModalOpen, setUnsuspendModalOpen] = useState(false);

    if (isLoading) {
        return <Loader fullScreen message="Loading user profile..." />;
    }

    if (error || !userData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-secondary)] gap-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <div className="text-red-500 font-medium">{error?.message || "User not found"}</div>
                <Button onClick={() => router.back()} variant="outline">Go Back</Button>
            </div>
        );
    }

    const { user, stats } = userData;
    const isSeller = user.role === 'seller';
    const isSuspended = user.isSuspended;

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6 md:p-8 animate-fade-in pb-24">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Navigation */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-[var(--bg-primary)] rounded-full transition-colors text-[var(--text-secondary)]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Profile</h1>
                        <p className="text-[var(--text-secondary)]">Manage account details and permissions</p>
                    </div>
                </div>

                {/* Identity Card (Full Width) */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm relative">
                    {isSuspended && (
                        <div className="absolute top-0 right-0 p-4">
                            <Badge variant="error" className="text-sm px-3 py-1 flex items-center gap-1.5">
                                <Ban size={14} /> ACCOUNT SUSPENDED
                            </Badge>
                        </div>
                    )}

                    <div className="p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-2xl bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] flex items-center justify-center text-3xl font-bold border-4 border-[var(--bg-primary)] shadow-sm">
                                {(user.firstName?.[0] || user.company?.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-[var(--bg-primary)] p-1 rounded-full">
                                {user.role === 'admin' && <Badge variant="primary">ADMIN</Badge>}
                                {user.role === 'seller' && <Badge variant="success">SELLER</Badge>}
                                {user.role === 'staff' && <Badge variant="neutral">STAFF</Badge>}
                            </div>
                        </div>

                        <div className="flex-1 space-y-2">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                                {user.firstName ? `${user.firstName} ${user.lastName || ''}` : (user.company?.name || user.email)}
                            </h2>
                            <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] font-medium">
                                <div className="flex items-center gap-1.5">
                                    <Mail size={16} className="text-[var(--text-tertiary)]" />
                                    {user.email}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={16} className="text-[var(--text-tertiary)]" />
                                    Joined {new Date(user.createdAt).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Shield size={16} className="text-[var(--text-tertiary)]" />
                                    ID: <span className="font-mono text-xs bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">{user._id}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <Button
                                variant="outline"
                                className="w-full justify-start md:justify-center border-[var(--primary-blue-light)] text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)]"
                                onClick={() => impersonate({ userId: user._id })}
                                isLoading={isImpersonating}
                            >
                                <LogIn size={16} className="mr-2" />
                                {isImpersonating ? 'Accessing...' : 'Impersonate User'}
                            </Button>

                            {isSuspended ? (
                                <Button
                                    variant="outline"
                                    className="w-full justify-start md:justify-center border-[var(--success)]/20 text-[var(--success)] hover:bg-[var(--success-bg)]"
                                    onClick={() => setUnsuspendModalOpen(true)}
                                >
                                    <CheckCircle2 size={16} className="mr-2" /> Unsuspended Account
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full justify-start md:justify-center border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)]"
                                    onClick={() => setSuspendModalOpen(true)}
                                >
                                    <Ban size={16} className="mr-2" /> Suspend Account
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Seller Analytics (Bento Grid) */}
                {isSeller && stats && (
                    <div className="space-y-4 animate-slide-up bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-default)]">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Activity className="text-[var(--primary-blue)]" /> Performance Overview
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatsCard
                                title="Total Revenue"
                                value={formatCurrency(stats.orders.revenue)}
                                icon={Wallet}
                                variant="success"
                                description="Lifetime earnings"
                                delay={0.1}
                            />
                            <StatsCard
                                title="Total Orders"
                                value={stats.orders.total}
                                icon={Truck}
                                variant="info" // Blue
                                description={`${stats.shipments.total} shipments processed`}
                                delay={0.2}
                            />
                            <StatsCard
                                title="Risk Profile (RTO)"
                                value={`${stats.shipments.rtoRate}%`}
                                icon={AlertTriangle}
                                variant="warning"
                                description={`${stats.shipments.rto} RTO shipments`}
                                delay={0.3}
                            />
                            <StatsCard
                                title="Open Disputes"
                                value={stats.disputes.open}
                                icon={AlertCircle}
                                variant="critical"
                                description="Action required"
                                delay={0.4}
                            />
                        </div>
                    </div>
                )}

                {/* Detailed Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Company Details */}
                    {user.company && (
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                                    <Building2 className="text-[var(--text-tertiary)]" /> Company Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Business Name</label>
                                        <p className="font-medium text-[var(--text-primary)]">{user.company.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Email</label>
                                        <p className="font-medium text-[var(--text-primary)]">{user.email}</p>
                                    </div>
                                    {user.company.gstin && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">GSTIN</label>
                                            <p className="font-mono text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded inline-block">{user.company.gstin}</p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Wallet Balance</label>
                                        <p className="font-medium text-emerald-600">{formatCurrency(stats?.wallet?.balance || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right: Security & Risk */}
                    <div className="space-y-4">
                        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl p-6 h-full">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                                <Shield className="text-[var(--text-tertiary)]" /> Health Score
                            </h3>

                            <div className="flex flex-col items-center justify-center py-4">
                                {/* Calculate health score or use placeholder if not in stats (backend can send it in stats too, but lets approx for now or assume 100 if missing) */}
                                <HealthGauge score={
                                    // Simple client side calculation for visual consistency if backend doesn't send explicit score here
                                    // Better to use the one from list if available, but for now derive from RTO
                                    Math.max(0, 100 - ((stats?.shipments?.rtoRate || 0) * 2) - ((stats?.shipments?.ndrRate || 0)))
                                } size="lg" />
                                <div className="mt-4 text-center">
                                    <p className="text-sm text-[var(--text-secondary)]">Based on RTO & NDR metrics</p>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-tertiary)]">RTO Rate</span>
                                    <span className={`font-bold ${stats?.shipments?.rtoRate > 10 ? 'text-red-500' : 'text-green-500'}`}>
                                        {stats?.shipments?.rtoRate || 0}%
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-tertiary)]">NDR Rate</span>
                                    <span className={`font-bold ${stats?.shipments?.ndrRate > 10 ? 'text-orange-500' : 'text-green-500'}`}>
                                        {stats?.shipments?.ndrRate || 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <SuspendUserModal
                isOpen={suspendModalOpen}
                onClose={() => setSuspendModalOpen(false)}
                userId={user._id}
                userName={user.company?.name || user.firstName || 'User'}
                onSuccess={() => refetch()}
            />
            <UnsuspendUserModal
                isOpen={unsuspendModalOpen}
                onClose={() => setUnsuspendModalOpen(false)}
                userId={user._id}
                userName={user.company?.name || user.firstName || 'User'}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
