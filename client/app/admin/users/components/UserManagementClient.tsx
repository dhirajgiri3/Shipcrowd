"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserCheck,
    UserX,
    Shield,
    ShieldAlert,
    Building2,
    MoreVertical,
    User,
    LogIn
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import { cn, formatDate } from '@/src/lib/utils';
import {
    useUserList,
    usePromoteUser,
    useDemoteUser,
    useImpersonateUser,
    type UserListFilters,
    type UserListItem
} from '@/src/core/api/hooks/admin/useUserManagement';
import { PromoteUserModal } from './PromoteUserModal';
import { DemoteUserModal } from './DemoteUserModal';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

const roleColors = {
    super_admin: {
        bg: 'bg-[var(--primary-blue-soft)]',
        text: 'text-[var(--primary-blue)]',
        border: 'border-[var(--border-default)]',
        icon: ShieldAlert
    },
    admin: {
        bg: 'bg-[var(--info-bg)]',
        text: 'text-[var(--info)]',
        border: 'border-[var(--info-border)]',
        icon: Shield
    },
    seller: {
        bg: 'bg-[var(--success-bg)]',
        text: 'text-[var(--success)]',
        border: 'border-[var(--success-border)]',
        icon: Building2
    },
    staff: {
        bg: 'bg-[var(--bg-tertiary)]',
        text: 'text-[var(--text-secondary)]',
        border: 'border-[var(--border-default)]',
        icon: User
    },
    user: { // Generic V5 User (Pre-assignment)
        bg: 'bg-[var(--bg-tertiary)]',
        text: 'text-[var(--text-secondary)]',
        border: 'border-[var(--border-default)]',
        icon: User
    }
};

export function UserManagementClient() {
    const { addToast } = useToast();
    const [filters, setFilters] = useState<UserListFilters>({
        role: 'all',
        search: '',
        page: 1,
        limit: 20
    });
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showDemoteModal, setShowDemoteModal] = useState(false);

    const { data, isLoading, error } = useUserList(filters);

    const promoteUser = usePromoteUser();
    const demoteUser = useDemoteUser();
    const impersonateUser = useImpersonateUser();
    const [impersonateTarget, setImpersonateTarget] = useState<{ id: string; name: string } | null>(null);

    const handlePromote = async (userId: string, reason?: string) => {
        try {
            await promoteUser.mutateAsync({ userId, reason });
            addToast('User has been successfully promoted to admin', 'success');
            setShowPromoteModal(false);
            setSelectedUser(null);
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to promote user', 'error');
        }
    };

    const handleDemote = async (userId: string, reason?: string) => {
        try {
            await demoteUser.mutateAsync({ userId, reason });
            addToast('User has been successfully demoted to seller', 'success');
            setShowDemoteModal(false);
            setSelectedUser(null);
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to demote user', 'error');
        }
    };

    const handleImpersonate = async (userId: string, userName: string) => {
        setImpersonateTarget({ id: userId, name: userName });
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-4 md:p-6 lg:p-8">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-[1600px] mx-auto space-y-6"
            >
                <PageHeader
                    title="User Management"
                    description="Overview of platform users, role distribution, and permissions."
                    breadcrumbs={[
                        { label: 'Admin', href: '/admin' },
                        { label: 'Users', active: true },
                    ]}
                />

                <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Total Users"
                        value={data?.stats?.totalUsers || 0}
                        icon={Users}
                        variant="default"
                        trend={{ value: 12, label: 'this week', positive: true }}
                    />
                    <StatsCard
                        title="Super Admins"
                        value={data?.stats?.superAdmins || 0}
                        icon={ShieldAlert}
                        variant="info"
                    />
                    <StatsCard
                        title="Admins"
                        value={data?.stats?.admins || 0}
                        icon={Shield}
                        variant="info"
                    />
                    <StatsCard
                        title="Sellers"
                        value={data?.stats?.sellers || 0}
                        icon={Building2}
                        variant="success"
                    />
                </motion.div>

                {/* Controls & Table Container */}
                <motion.div variants={itemVariants} className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[var(--bg-primary)] p-1 rounded-xl">
                        <SearchInput
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                            placeholder="Search by name, email..."
                            widthClass="w-full sm:w-80"
                        />

                        <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                            {['all', 'super_admin', 'admin', 'seller', 'staff'].map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setFilters({ ...filters, role: role as any, page: 1 })}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                                        filters.role === role
                                            ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                                    )}
                                >
                                    {role === 'all' ? 'All Roles' : role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                            <div className="col-span-4">User</div>
                            <div className="col-span-3">Role</div>
                            <div className="col-span-3">Company</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-[var(--border-subtle)]">
                            {isLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-[var(--primary-blue-light)] border-t-[var(--primary-blue)] rounded-full animate-spin mb-4" />
                                    <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
                                </div>
                            ) : !data?.users?.length ? (
                                <div className="py-16 text-center">
                                    <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-6 h-6 text-[var(--text-muted)]" />
                                    </div>
                                    <p className="text-[var(--text-secondary)]">No users found</p>
                                </div>
                            ) : (
                                data.users.map((user: UserListItem) => (
                                    <UserRow
                                        key={user._id}
                                        user={user}
                                        onPromote={() => { setSelectedUser(user); setShowPromoteModal(true); }}
                                        onDemote={() => { setSelectedUser(user); setShowDemoteModal(true); }}
                                        onImpersonate={() => handleImpersonate(user._id, user.name)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Pagination Footer */}
                        {data && data.pagination && data.pagination.totalPages > 1 && (
                            <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] flex items-center justify-between">
                                <span className="text-xs text-[var(--text-tertiary)]">
                                    Page {filters.page || 1} of {data.pagination.totalPages} ({data.pagination.totalUsers} items)
                                </span>
                                <div className="flex gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFilters({ ...filters, page: 1 })}
                                        disabled={(filters.page || 1) === 1}
                                        className="h-8 w-8 p-0 text-xs"
                                        title="First Page"
                                    >
                                        «
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                        disabled={(filters.page || 1) === 1}
                                        className="h-8 w-8 p-0 text-xs"
                                    >
                                        ‹
                                    </Button>

                                    {/* Page Numbers */}
                                    {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                                        // Logic to show ranges centered around current page
                                        let pageNum = (filters.page || 1) - 2 + i;
                                        if ((filters.page || 1) < 3) pageNum = i + 1;
                                        if ((filters.page || 1) > data.pagination.totalPages - 2) pageNum = data.pagination.totalPages - 4 + i;

                                        if (pageNum > 0 && pageNum <= data.pagination.totalPages) {
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={pageNum === (filters.page || 1) ? "primary" : "outline"}
                                                    size="sm"
                                                    onClick={() => setFilters({ ...filters, page: pageNum })}
                                                    className={cn(
                                                        "h-8 w-8 p-0 text-xs",
                                                        pageNum === (filters.page || 1) ? "bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)]" : ""
                                                    )}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        }
                                        return null;
                                    })}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                        disabled={(filters.page || 1) >= data.pagination.totalPages}
                                        className="h-8 w-8 p-0 text-xs"
                                    >
                                        ›
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFilters({ ...filters, page: data.pagination.totalPages })}
                                        disabled={(filters.page || 1) >= data.pagination.totalPages}
                                        className="h-8 w-8 p-0 text-xs"
                                        title="Last Page"
                                    >
                                        »
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* Modals */}
            <AnimatePresence>
                {showPromoteModal && selectedUser && (
                    <PromoteUserModal
                        user={selectedUser}
                        onClose={() => { setShowPromoteModal(false); setSelectedUser(null); }}
                        onConfirm={(reason) => handlePromote(selectedUser._id, reason)}
                        isLoading={promoteUser.isPending}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDemoteModal && selectedUser && (
                    <DemoteUserModal
                        user={selectedUser}
                        onClose={() => { setShowDemoteModal(false); setSelectedUser(null); }}
                        onConfirm={(reason) => handleDemote(selectedUser._id, reason)}
                        isLoading={demoteUser.isPending}
                    />
                )}
            </AnimatePresence>

            <ConfirmDialog
                open={!!impersonateTarget}
                title="Login as user"
                description={
                    impersonateTarget
                        ? `Are you sure you want to login as ${impersonateTarget.name}? You will be logged out of your current session.`
                        : undefined
                }
                confirmText="Continue"
                confirmVariant="danger"
                onCancel={() => setImpersonateTarget(null)}
                onConfirm={async () => {
                    if (!impersonateTarget) return;
                    try {
                        await impersonateUser.mutateAsync({ userId: impersonateTarget.id });
                    } catch (error: any) {
                        addToast(error.response?.data?.message || 'Failed to impersonate user', 'error');
                    } finally {
                        setImpersonateTarget(null);
                    }
                }}
            />
        </div>
    );
}

function UserRow({ user, onPromote, onDemote, onImpersonate }: any) {
    const roleConfig = roleColors[user.role as keyof typeof roleColors] || roleColors.user;
    const RoleIcon = roleConfig.icon;
    const isSuperAdmin = user.role === 'super_admin';

    // Subtle stripe effect & hover
    return (
        <div className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-[var(--bg-hover)] transition-colors group">
            {/* User Column */}
            <div className="col-span-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">{user.email}</p>
                </div>
            </div>

            {/* Role Column - Using Pill for hierarchy */}
            <div className="col-span-3">
                <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
                    roleConfig.bg, roleConfig.border, roleConfig.text.replace('text-', 'text-opacity-90 ') // Adjust opacity for pill
                )}>
                    <RoleIcon className="w-3.5 h-3.5" />
                    <span className="capitalize">{user.role.replace('_', ' ')}</span>
                </div>
                {user.isDualRole && (
                    <span className="ml-2 text-[10px] bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] px-1.5 py-0.5 rounded border border-[var(--primary-blue-light)]">
                        DUAL
                    </span>
                )}
            </div>

            {/* Company Column */}
            <div className="col-span-3">
                {user.companyName ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Building2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        <span className="truncate">{user.companyName}</span>
                    </div>
                ) : (
                    <span className="text-xs text-[var(--text-muted)] italic">No Company</span>
                )}
            </div>

            {/* Actions Column - Hidden by default until hover */}
            <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isSuperAdmin && (
                    <button
                        onClick={onImpersonate}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] rounded-lg transition-colors tooltip tooltip-left"
                        title="Login as User">
                        <LogIn className="w-4 h-4" />
                    </button>
                )}
                {user.canPromote && (
                    <button
                        onClick={onPromote}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--success)] hover:bg-[var(--success-bg)] rounded-lg transition-colors tooltip tooltip-left"
                        title="Promote to Admin">
                        <UserCheck className="w-4 h-4" />
                    </button>
                )}
                {user.canDemote && (
                    <button
                        onClick={onDemote}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error-bg)] rounded-lg transition-colors tooltip tooltip-left"
                        title="Demote to Seller">
                        <UserX className="w-4 h-4" />
                    </button>
                )}
                <button className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
