'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Mail } from 'lucide-react';
import {
    useAdminCompanies,
    useAdminCompanyStats,
    useCreateCompany,
    useInviteOwner,
    useUpdateCompanyStatus
} from '@/src/core/api/hooks/admin/companies/useCompanies';
import { Company } from '@/src/core/api/clients/companyApi';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Card } from '@/src/components/ui/core/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/src/components/ui/core/Table';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { showSuccessToast } from '@/src/lib/error';

export function CompaniesClient() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    // Hooks
    const {
        data: companiesData,
        isLoading: isCompaniesLoading,
        isError: isCompaniesError
    } = useAdminCompanies({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
    });

    const { data: stats } = useAdminCompanyStats();
    const updateStatusMutation = useUpdateCompanyStatus();

    const handleStatusChange = (companyId: string, newStatus: Company['status']) => {
        updateStatusMutation.mutate({ companyId, status: newStatus });
    };

    const handleInviteClick = (company: Company) => {
        setSelectedCompany(company);
        setShowInviteModal(true);
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Company Management</h1>
                    <p className="text-[var(--text-muted)]">Manage all companies and their verification status</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    className="gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Company
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatsCard label="Total" value={stats.total} delay={0} />
                    <StatsCard label="Active" value={stats.active} color="text-green-500" delay={0.1} />
                    <StatsCard label="Pending" value={stats.byStatus.pending_verification} color="text-yellow-500" delay={0.2} />
                    <StatsCard label="KYC Submitted" value={stats.byStatus.kyc_submitted} color="text-blue-500" delay={0.3} />
                    <StatsCard label="Approved" value={stats.byStatus.approved} color="text-green-500" delay={0.4} />
                    <StatsCard label="Suspended/Rejected" value={stats.byStatus.suspended + stats.byStatus.rejected} color="text-red-500" delay={0.5} />
                </div>
            )}

            {/* Search Bar */}
            <Card className="p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <Input
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </Card>

            {/* Companies Table */}
            <Card className="overflow-hidden">
                {isCompaniesLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader size="lg" />
                    </div>
                ) : isCompaniesError ? (
                    <EmptyState
                        title="Failed to load companies"
                        description="There was an error fetching the companies list. Please try again."
                        action={{ label: "Retry", onClick: () => window.location.reload() }}
                    />
                ) : !companiesData?.companies.length ? (
                    <EmptyState
                        title="No companies found"
                        description="Try adjusting your search or create a new company."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company Name</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {companiesData.companies.map((company) => (
                                        <TableRow key={company._id}>
                                            <TableCell className="font-medium text-[var(--text-primary)]">
                                                {company.name}
                                            </TableCell>
                                            <TableCell className="text-[var(--text-secondary)]">
                                                {company.address.city}, {company.address.state}
                                            </TableCell>
                                            <TableCell>
                                                <select
                                                    value={company.status}
                                                    onChange={(e) => handleStatusChange(company._id, e.target.value as Company['status'])}
                                                    className="bg-transparent text-xs font-medium border-0 focus:ring-0 cursor-pointer"
                                                >
                                                    <option value="pending_verification">Pending</option>
                                                    <option value="kyc_submitted">KYC Submitted</option>
                                                    <option value="approved">Approved</option>
                                                    <option value="suspended">Suspended</option>
                                                    <option value="rejected">Rejected</option>
                                                </select>
                                                {/* Visual indicator since select might be unstyled */}
                                                <div className="mt-1">
                                                    <StatusBadge
                                                        domain="company"
                                                        status={company.status}
                                                        size="sm"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[var(--text-secondary)]">
                                                {new Date(company.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleInviteClick(company)}
                                                    className="gap-2"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                    Invite Owner
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {companiesData.pagination && companiesData.pagination.pages > 1 && (
                            <div className="flex justify-between items-center p-4 border-t border-[var(--border-subtle)]">
                                <div className="text-sm text-[var(--text-muted)]">
                                    Page {currentPage} of {companiesData.pagination.pages}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(companiesData.pagination.pages, p + 1))}
                                        disabled={currentPage === companiesData.pagination.pages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Modals */}
            <CreateCompanyModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />

            {selectedCompany && (
                <InviteOwnerModal
                    company={selectedCompany}
                    isOpen={showInviteModal}
                    onClose={() => {
                        setShowInviteModal(false);
                        setSelectedCompany(null);
                    }}
                />
            )}
        </div>
    );
}

function StatsCard({ label, value, color = 'text-white', delay }: { label: string; value: number; color?: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <Card className="p-4">
                <div className="text-[var(--text-muted)] text-sm mb-1">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </Card>
        </motion.div>
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
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-lg)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] resize-none"
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
