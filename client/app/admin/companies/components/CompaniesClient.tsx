'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Mail,
    Building2,
    Users,
    Clock,
    CheckCircle2,
    Ban,
    MapPin,
    ArrowUpRight,
    MoreHorizontal,
    LayoutGrid,
    List,
    FileOutput,
    UserPlus,
    Loader2
} from 'lucide-react';
import {
    useAdminCompanies,
    useAdminCompanyStats,
    useCreateCompany,
    useInviteOwner,
    useUpdateCompanyStatus,
    CompanyListParams
} from '@/src/core/api/hooks/admin/companies/useCompanies';
import { Company } from '@/src/core/api/clients/general/companyApi';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { useDebouncedValue } from '@/src/hooks/data';
import { cn } from '@/src/lib/utils';

const COMPANY_TABS = [
    { key: 'all', label: 'All Companies' },
    { key: 'approved', label: 'Approved' },
    { key: 'pending_verification', label: 'Pending Verification' },
    { key: 'suspended', label: 'Suspended' },
] as const;
type CompanyTabKey = (typeof COMPANY_TABS)[number]['key'];

export function CompaniesClient() {
    const [activeTab, setActiveTab] = useState<CompanyTabKey>('all');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 500);

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Hooks
    const {
        data: companiesData,
        isLoading: isCompaniesLoading,
        isError: isCompaniesError,
        refetch
    } = useAdminCompanies({
        search: debouncedSearch,
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 50 // Increased limit for better view
    });

    const { data: statsData } = useAdminCompanyStats();

    // Mutations
    const updateStatusMutation = useUpdateCompanyStatus();
    const { mutate: performAction, isPending: isActionPending } = updateStatusMutation;

    // Derived State
    const companies = companiesData?.companies || [];
    const stats = useMemo(() => ({
        total: statsData?.total || 0,
        active: statsData?.active || 0,
        pending: statsData?.byStatus?.pending_verification || 0,
        suspended: statsData?.byStatus?.suspended || 0,
    }), [statsData]);

    // Handlers
    const handleViewCompany = (company: Company) => {
        setSelectedCompany(company);
        setIsDetailOpen(true);
    };

    const handleInviteClick = (company: Company, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedCompany(company);
        setShowInviteModal(true);
    };

    const handleAction = (status: Company['status']) => {
        if (!selectedCompany) return;

        performAction({
            companyId: selectedCompany._id,
            status
        }, {
            onSuccess: () => {
                setIsDetailOpen(false);
            }
        });
    };

    // Columns Configuration
    const columns = [
        {
            header: 'Company',
            accessorKey: 'name' as const,
            cell: (row: Company) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] flex items-center justify-center font-bold text-sm uppercase">
                        {row.name.substring(0, 2)}
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--text-primary)]">{row.name}</p>
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {row.address?.city || 'N/A'}
                        </p>
                    </div>
                </div>
            )
        },
        {
            header: 'Location',
            accessorKey: 'address' as const,
            cell: (row: Company) => (
                <span className="text-sm text-[var(--text-secondary)]">
                    {row.address?.city}, {row.address?.state}
                </span>
            )
        },
        {
            header: 'Joined',
            accessorKey: 'createdAt' as const,
            cell: (row: Company) => (
                <span className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(row.createdAt).toLocaleDateString()}
                </span>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status' as const,
            cell: (row: Company) => (
                <StatusBadge
                    domain="company"
                    status={row.status}
                    size="sm"
                />
            )
        },
        {
            header: 'Actions',
            accessorKey: '_id' as const,
            width: 'min-w-[100px]',
            stickyRight: true,
            cell: (row: Company) => (
                <div className="flex items-center gap-2">
                    <ViewActionButton
                        onClick={() => handleViewCompany(row)}
                    />
                    <Button variant="ghost" size="sm" onClick={(e) => handleInviteClick(row, e)}>
                        <Mail className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    if (isCompaniesError) {
        return (
            <div className="p-6">
                <EmptyState
                    title="Failed to load companies"
                    description="There was an error fetching the companies list. Please try again."
                    action={{ label: "Retry", onClick: () => refetch() }}
                />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen pb-10">
            <PageHeader
                title="Company Management"
                description="Monitor performance and manage accounts"
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Companies', active: true }]}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="hidden md:flex">
                            <FileOutput className="h-4 w-4 mr-1.5" />
                            Export
                        </Button>
                        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Create Company
                        </Button>
                    </div>
                }
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Companies" value={stats.total} icon={Users} variant="info" />
                <StatsCard title="Active Companies" value={stats.active} icon={CheckCircle2} variant="success" />
                <StatsCard
                    title="Pending Approval"
                    value={stats.pending}
                    icon={Clock}
                    variant={stats.pending > 0 ? "warning" : "default"}
                />
                <StatsCard title="Suspended" value={stats.suspended} icon={Ban} variant="critical" />
            </div>

            {/* Filters & Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <PillTabs
                    tabs={COMPANY_TABS}
                    activeTab={activeTab}
                    onTabChange={(key) => setActiveTab(key)}
                />

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <SearchInput
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        widthClass="flex-1 md:w-64"
                    />
                    <div className="flex bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isCompaniesLoading ? (
                <div className="flex justify-center p-20">
                    <Loader size="lg" message="Loading companies..." />
                </div>
            ) : !companies.length ? (
                <EmptyState
                    title="No companies found"
                    description="Try adjusting your search or create a new company."
                    action={{
                        label: 'Create Company',
                        onClick: () => setShowCreateModal(true),
                        icon: <Plus className="w-4 h-4" />
                    }}
                />
            ) : viewMode === 'table' ? (
                <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                    <DataTable columns={columns} data={companies} />
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {companies.map((company) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={company._id}
                                onClick={() => handleViewCompany(company)}
                                className="group relative p-6 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <button className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-xl font-bold text-[var(--primary-blue)] uppercase">
                                        {company.name.substring(0, 2)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--text-primary)] text-lg">{company.name}</h3>
                                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {company.address?.city || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                                        <p className="text-xs text-[var(--text-muted)]">Wallet</p>
                                        <p className="font-bold text-[var(--text-primary)]">N/A</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                                        <p className="text-xs text-[var(--text-muted)]">Joined</p>
                                        <p className="font-bold text-[var(--text-primary)]">{new Date(company.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-subtle)]">
                                    <StatusBadge domain="company" status={company.status} size="sm" />
                                    <span className="text-xs font-medium text-[var(--primary-blue)] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                        View Details <ArrowUpRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modals */}
            <CreateCompanyModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />

            {selectedCompany && (
                <>
                    <InviteOwnerModal
                        company={selectedCompany}
                        isOpen={showInviteModal}
                        onClose={() => {
                            setShowInviteModal(false);
                            // Not clearing selectedCompany here to avoid detail modal closing if it was open separately? 
                            // Actually invite modal is separate. But if triggered from card, we want to just close invite modal.
                        }}
                    />

                    <Modal
                        isOpen={isDetailOpen}
                        onClose={() => {
                            setIsDetailOpen(false);
                            // Only clear selected company if invite modal is not active (basic logic)
                            if (!showInviteModal) setSelectedCompany(null);
                        }}
                        title={selectedCompany.name || 'Company Details'}
                    >
                        <div className="space-y-6">
                            {/* Profile Section */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                <div className="w-16 h-16 rounded-full bg-[var(--primary-blue)] text-white flex items-center justify-center text-xl font-bold uppercase">
                                    {selectedCompany.name.substring(0, 2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)]">{selectedCompany.name}</h3>
                                    <div className="flex flex-col text-sm text-[var(--text-secondary)] mt-1 gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5" /> {selectedCompany.address?.city || 'No City'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5" /> Joined {new Date(selectedCompany.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Address Section */}
                            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Address</h4>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {selectedCompany.address.line1}<br />
                                    {selectedCompany.address.line2 && <>{selectedCompany.address.line2}<br /></>}
                                    {selectedCompany.address.city}, {selectedCompany.address.state}, {selectedCompany.address.postalCode}<br />
                                    {selectedCompany.address.country}
                                </p>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <Button variant="primary" className="flex-1">
                                        Login as Admin
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={() => setShowInviteModal(true)}
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        Invite Owner
                                    </Button>
                                </div>

                                {selectedCompany.status === 'pending_verification' || selectedCompany.status === 'kyc_submitted' ? (
                                    <Button
                                        variant="primary"
                                        onClick={() => handleAction('approved')}
                                        disabled={isActionPending}
                                    >
                                        {isActionPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                        Approve Company
                                    </Button>
                                ) : selectedCompany.status === 'approved' ? (
                                    <Button
                                        variant="outline"
                                        className="w-full border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)]"
                                        onClick={() => handleAction('suspended')}
                                        disabled={isActionPending}
                                    >
                                        {isActionPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                                        Suspend Company
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </Modal>
                </>
            )}
        </div>
    );
}

function CreateCompanyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [formData, setFormData] = useState({
        name: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
    });

    const createCompanyMutation = useCreateCompany();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        createCompanyMutation.mutate({
            name: formData.name,
            address: {
                line1: formData.line1,
                line2: formData.line2 || undefined,
                city: formData.city,
                state: formData.state,
                country: 'India',
                postalCode: formData.postalCode,
            },
        }, {
            onSuccess: () => {
                onClose();
                setFormData({
                    name: '',
                    line1: '',
                    line2: '',
                    city: '',
                    state: '',
                    postalCode: '',
                });
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Company">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Company Name</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Address Line 1</label>
                    <Input
                        value={formData.line1}
                        onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Address Line 2</label>
                    <Input
                        value={formData.line2}
                        onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">City</label>
                        <Input
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">State</label>
                        <Input
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Postal Code</label>
                    <Input
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        required
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={createCompanyMutation.isPending}
                        className="flex-1"
                    >
                        {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function InviteOwnerModal({ company, isOpen, onClose }: { company: Company; isOpen: boolean; onClose: () => void }) {
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        message: '',
    });

    const inviteOwnerMutation = useInviteOwner();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        inviteOwnerMutation.mutate({
            companyId: company._id,
            data: formData
        }, {
            onSuccess: () => {
                onClose();
                setFormData({ email: '', name: '', message: '' });
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invite Company Owner">
            <p className="text-[var(--text-secondary)] mb-6">
                Send invitation to manage <span className="text-[var(--text-primary)] font-medium">{company.name}</span>
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Owner Name</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email Address</label>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Message (Optional)</label>
                    <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={3}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-lg)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue-soft)] focus:border-[var(--border-focus)] resize-none"
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={inviteOwnerMutation.isPending}
                        className="flex-1"
                    >
                        {inviteOwnerMutation.isPending ? 'Sending...' : 'Send Invitation'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
