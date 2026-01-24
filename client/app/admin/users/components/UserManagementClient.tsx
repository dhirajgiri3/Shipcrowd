"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    Filter,
    UserCheck,
    UserX,
    Shield,
    ShieldAlert,
    Building2,
    ChevronDown,
    MoreVertical,
    ArrowUpRight,
    ArrowDownRight,
    User
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn, formatDate } from '@/src/lib/utils';
import {
    useUserList,
    usePromoteUser,
    useDemoteUser,
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
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
        icon: ShieldAlert
    },
    admin: {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        icon: Shield
    },
    seller: {
        bg: 'bg-green-50 dark:bg-green-950/30',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        icon: Building2
    },
    staff: {
        bg: 'bg-gray-50 dark:bg-gray-950/30',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-800',
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

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-4 md:p-6 lg:p-8">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-[1600px] mx-auto space-y-6"
            >
                {/* Header */}
                <motion.div variants={itemVariants} className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                            <div className="p-2 bg-[var(--primary-blue)] rounded-xl">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            User Management
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Manage platform users, roles, and permissions
                        </p>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatsCard
                        title="Total Users"
                        value={data?.pagination?.totalUsers || 0}
                        icon={Users}
                        trend="+12%"
                        trendUp
                    />
                    <StatsCard
                        title="Super Admins"
                        value={data?.users.filter((u: UserListItem) => u.role === 'super_admin').length || 0}
                        icon={ShieldAlert}
                        color="purple"
                    />
                    <StatsCard
                        title="Admins"
                        value={data?.users.filter((u: UserListItem) => u.role === 'admin').length || 0}
                        icon={Shield}
                        color="blue"
                    />
                    <StatsCard
                        title="Sellers"
                        value={data?.users.filter((u: UserListItem) => u.role === 'seller').length || 0}
                        icon={Building2}
                        color="green"
                    />
                </motion.div>

                {/* Filters */}
                <motion.div
                    variants={itemVariants}
                    className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-4"
                >
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent"
                            />
                        </div>

                        {/* Role Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)] pointer-events-none" />
                            <select
                                value={filters.role}
                                onChange={(e) => setFilters({ ...filters, role: e.target.value as any, page: 1 })}
                                className="pl-10 pr-10 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent appearance-none cursor-pointer min-w-[180px]"
                            >
                                <option value="all">All Roles</option>
                                <option value="super_admin">Super Admin</option>
                                <option value="admin">Admin</option>
                                <option value="seller">Seller</option>
                                <option value="staff">Staff</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)] pointer-events-none" />
                        </div>
                    </div>
                </motion.div>

                {/* Users List */}
                <motion.div variants={itemVariants}>
                    {isLoading ? (
                        <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--border-subtle)] border-t-[var(--primary-blue)]" />
                            <p className="mt-4 text-[var(--text-secondary)]">Loading users...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
                            <p className="text-red-700 dark:text-red-400">Failed to load users</p>
                        </div>
                    ) : (
                        <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                            <div className="grid grid-cols-1 divide-y divide-[var(--border-subtle)]">
                                {data?.users.map((user: UserListItem) => (
                                    <UserCard
                                        key={user._id}
                                        user={user}
                                        onPromote={() => {
                                            setSelectedUser(user);
                                            setShowPromoteModal(true);
                                        }}
                                        onDemote={() => {
                                            setSelectedUser(user);
                                            setShowDemoteModal(true);
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {data && data.pagination && data.pagination.totalPages > 1 && (
                                <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Showing {((filters.page || 1) - 1) * (filters.limit || 20) + 1} to{' '}
                                        {Math.min((filters.page || 1) * (filters.limit || 20), data.pagination.totalUsers)} of {data.pagination.totalUsers} users
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                            disabled={(filters.page || 1) === 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                            disabled={(filters.page || 1) >= data.pagination.totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>

            {/* Modals */}
            <AnimatePresence>
                {showPromoteModal && selectedUser && (
                    <PromoteUserModal
                        user={selectedUser}
                        onClose={() => {
                            setShowPromoteModal(false);
                            setSelectedUser(null);
                        }}
                        onConfirm={(reason) => handlePromote(selectedUser._id, reason)}
                        isLoading={promoteUser.isPending}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDemoteModal && selectedUser && (
                    <DemoteUserModal
                        user={selectedUser}
                        onClose={() => {
                            setShowDemoteModal(false);
                            setSelectedUser(null);
                        }}
                        onConfirm={(reason) => handleDemote(selectedUser._id, reason)}
                        isLoading={demoteUser.isPending}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color = 'blue', trend, trendUp }: any) {
    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-[var(--text-secondary)] font-medium">{title}</p>
                    <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{value}</p>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 mt-2 text-sm font-medium",
                            trendUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                            {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {trend}
                        </div>
                    )}
                </div>
                <div className={cn(
                    "p-3 rounded-xl",
                    color === 'purple' && "bg-purple-100 dark:bg-purple-950/50",
                    color === 'blue' && "bg-blue-100 dark:bg-blue-950/50",
                    color === 'green' && "bg-green-100 dark:bg-green-950/50"
                )}>
                    <Icon className={cn(
                        "w-6 h-6",
                        color === 'purple' && "text-purple-600 dark:text-purple-400",
                        color === 'blue' && "text-blue-600 dark:text-blue-400",
                        color === 'green' && "text-green-600 dark:text-green-400"
                    )} />
                </div>
            </div>
        </div>
    );
}

function UserCard({ user, onPromote, onDemote }: any) {
    const roleConfig = roleColors[user.role as keyof typeof roleColors];
    const RoleIcon = roleConfig.icon;

    return (
        <div className="p-5 hover:bg-[var(--bg-hover)] transition-colors group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[var(--text-primary)] truncate">{user.name}</h3>
                            {user.isDualRole && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 rounded-full">
                                    Dual Role
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] truncate">{user.email}</p>
                        {user.companyName && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <Building2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                                <p className="text-xs text-[var(--text-tertiary)] truncate">{user.companyName}</p>
                            </div>
                        )}
                    </div>

                    {/* Role Badge */}
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                        roleConfig.bg,
                        roleConfig.text,
                        roleConfig.border
                    )}>
                        <RoleIcon className="w-4 h-4" />
                        <span className="text-sm font-medium capitalize">{user.role.replace('_', ' ')}</span>
                    </div>

                    {/* Stats */}
                    <div className="hidden lg:flex items-center gap-6 text-sm">
                        <div className="text-center">
                            <p className="font-semibold text-[var(--text-primary)]">{user.totalOrders || 0}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">Orders</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                    {user.canPromote && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onPromote}
                            className="gap-2"
                        >
                            <UserCheck className="w-4 h-4" />
                            Promote
                        </Button>
                    )}
                    {user.canDemote && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onDemote}
                            className="gap-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                            <UserX className="w-4 h-4" />
                            Demote
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
