'use client';

import { useState, useEffect } from 'react';
import { companyApi, Company, CompanyStats } from '@/src/core/api/companyApi';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [stats, setStats] = useState<CompanyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    useEffect(() => {
        fetchCompanies();
        fetchStats();
    }, [currentPage, searchTerm]);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const data = await companyApi.getAllCompanies({
                page: currentPage,
                limit: 10,
                search: searchTerm || undefined,
            });
            setCompanies(data.companies);
            setTotalPages(data.pagination.pages);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch companies');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await companyApi.getCompanyStats();
            setStats(data);
        } catch (error: any) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleStatusChange = async (companyId: string, newStatus: Company['status']) => {
        try {
            await companyApi.updateCompanyStatus(companyId, newStatus);
            toast.success('Company status updated successfully');
            fetchCompanies();
            fetchStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const getStatusColor = (status: Company['status']) => {
        const colors = {
            pending_verification: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/30',
            kyc_submitted: 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]/30',
            approved: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/30',
            suspended: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/30',
            rejected: 'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error)]/30',
        };
        return colors[status];
    };

    const getStatusLabel = (status: Company['status']) => {
        const labels = {
            pending_verification: 'Pending',
            kyc_submitted: 'KYC Submitted',
            approved: 'Approved',
            suspended: 'Suspended',
            rejected: 'Rejected',
        };
        return labels[status];
    };

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Company Management</h1>
                    <p className="text-gray-400">Manage all companies and their verification status</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white rounded-lg font-medium hover:shadow-lg hover:shadow-[var(--primary-blue)]/20 transition-all"
                >
                    + Create Company
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                    >
                        <div className="text-gray-400 text-sm mb-1">Total</div>
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                    >
                        <div className="text-gray-400 text-sm mb-1">Active</div>
                        <div className="text-2xl font-bold text-[var(--success)]">{stats.active}</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                    >
                        <div className="text-gray-400 text-sm mb-1">Pending</div>
                        <div className="text-2xl font-bold text-[var(--warning)]">{stats.byStatus.pending_verification}</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                    >
                        <div className="text-gray-400 text-sm mb-1">KYC Submitted</div>
                        <div className="text-2xl font-bold text-[var(--info)]">{stats.byStatus.kyc_submitted}</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                    >
                        <div className="text-gray-400 text-sm mb-1">Approved</div>
                        <div className="text-2xl font-bold text-[var(--success)]">{stats.byStatus.approved}</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                    >
                        <div className="text-gray-400 text-sm mb-1">Suspended/Rejected</div>
                        <div className="text-2xl font-bold text-[var(--error)]">{stats.byStatus.suspended + stats.byStatus.rejected}</div>
                    </motion.div>
                </div>
            )}

            {/* Search Bar */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <input
                    type="text"
                    placeholder="Search companies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[var(--primary-blue)]/50"
                />
            </div>

            {/* Companies Table */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-blue)]"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Company Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Location</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Created</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {companies.map((company) => (
                                    <tr key={company._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{company.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-400 text-sm">
                                                {company.address.city}, {company.address.state}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={company.status}
                                                onChange={(e) => handleStatusChange(company._id, e.target.value as Company['status'])}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(company.status)} bg-transparent cursor-pointer`}
                                            >
                                                <option value="pending_verification">Pending</option>
                                                <option value="kyc_submitted">KYC Submitted</option>
                                                <option value="approved">Approved</option>
                                                <option value="suspended">Suspended</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-400 text-sm">
                                                {new Date(company.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedCompany(company);
                                                    setShowInviteModal(true);
                                                }}
                                                className="px-4 py-2 bg-[var(--primary-blue)]/20 text-[var(--primary-blue)] rounded-lg text-sm font-medium hover:bg-[var(--primary-blue)]/30 transition-colors"
                                            >
                                                Invite Owner
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 py-4 border-t border-white/10">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white/5 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-gray-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white/5 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Create Company Modal */}
            {showCreateModal && (
                <CreateCompanyModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        fetchCompanies();
                        fetchStats();
                    }}
                />
            )}

            {/* Invite Owner Modal */}
            {showInviteModal && selectedCompany && (
                <InviteOwnerModal
                    company={selectedCompany}
                    onClose={() => {
                        setShowInviteModal(false);
                        setSelectedCompany(null);
                    }}
                />
            )}
        </div>
    );
}

// Create Company Modal Component
function CreateCompanyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        name: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await companyApi.createCompany({
                name: formData.name,
                address: {
                    line1: formData.line1,
                    line2: formData.line2 || undefined,
                    city: formData.city,
                    state: formData.state,
                    country: 'India',
                    postalCode: formData.postalCode,
                },
            });
            toast.success('Company created successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create company');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full"
            >
                <h2 className="text-2xl font-bold text-white mb-4">Create New Company</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Company Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-blue)]/50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Address Line 1</label>
                        <input
                            type="text"
                            value={formData.line1}
                            onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-blue)]/50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Address Line 2</label>
                        <input
                            type="text"
                            value={formData.line2}
                            onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-blue)]/50"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-blue)]/50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">State</label>
                            <input
                                type="text"
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-blue)]/50"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Postal Code</label>
                        <input
                            type="text"
                            value={formData.postalCode}
                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-blue)]/50"
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Creating...' : 'Create Company'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// Invite Owner Modal Component
function InviteOwnerModal({ company, onClose }: { company: Company; onClose: () => void }) {
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        message: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await companyApi.inviteOwner(company._id, formData);
            toast.success('Owner invitation sent successfully');
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send invitation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full"
            >
                <h2 className="text-2xl font-bold text-white mb-2">Invite Company Owner</h2>
                <p className="text-gray-400 mb-6">
                    Send invitation to manage <span className="text-white font-medium">{company.name}</span>
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Owner Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-blue)]/50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-blue)]/50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Message (Optional)</label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-blue)]/50 resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
