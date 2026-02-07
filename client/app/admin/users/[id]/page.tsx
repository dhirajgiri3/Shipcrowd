"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/src/core/api/http';
import { ArrowLeft, User, Building2, Mail, Calendar, Shield, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserDetails {
    _id: string;
    email: string;
    role: string;
    company?: {
        name: string;
        legalName?: string;
        gstin?: string;
    };
    firstName?: string;
    lastName?: string;
    createdAt: string;
    lastLogin?: string;
    status: string;
}

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Assuming the endpoint is /admin/users/:id based on controller
                const response = await apiClient.get(`/admin/users/${id}`);
                setUser(response.data.data);
            } catch (err: any) {
                console.error("Failed to fetch user details:", err);
                setError(err.response?.data?.message || "Failed to load user details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchUser();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-secondary)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-secondary)] gap-4">
                <div className="text-red-500 font-medium">{error}</div>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-hover)]"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6 md:p-8 animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-[var(--bg-primary)] rounded-full transition-colors text-[var(--text-secondary)]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Details</h1>
                        <p className="text-[var(--text-secondary)]">View and manage user information</p>
                    </div>
                </div>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-sm"
                >
                    {/* User Profile Header */}
                    <div className="p-8 border-b border-[var(--border-default)] flex flex-col md:flex-row gap-6 items-start md:items-center bg-gradient-to-r from-[var(--bg-primary)] to-[var(--bg-secondary)]">
                        <div className="w-20 h-20 rounded-full bg-[var(--primary-blue-soft)] text-primary-blue flex items-center justify-center text-3xl font-bold border-4 border-[var(--bg-primary)] shadow-sm">
                            {(user.firstName?.[0] || user.company?.name?.[0] || user.email[0]).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    {user.firstName ? `${user.firstName} ${user.lastName || ''}` : (user.company?.name || user.email)}
                                </h2>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${user.role === 'seller' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        user.role === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            'bg-gray-100 text-gray-700 border-gray-200'
                                    }`}>
                                    {user.role.toUpperCase()}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                        user.status === 'suspended' ? 'bg-red-100 text-red-700 border-red-200' :
                                            'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    }`}>
                                    {user.status?.toUpperCase() || 'ACTIVE'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                                <div className="flex items-center gap-1.5">
                                    <Mail size={14} className="text-[var(--text-tertiary)]" />
                                    {user.email}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} className="text-[var(--text-tertiary)]" />
                                    Joined {new Date(user.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Company Info */}
                        {user.company && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-2">
                                    <Building2 size={16} /> Company Information
                                </h3>
                                <div className="bg-[var(--bg-secondary)] rounded-lg p-5 space-y-3 border border-[var(--border-subtle)]">
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <span className="text-[var(--text-tertiary)]">Business Name</span>
                                        <span className="col-span-2 font-medium text-[var(--text-primary)]">{user.company.name}</span>
                                    </div>
                                    {user.company.legalName && (
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <span className="text-[var(--text-tertiary)]">Legal Name</span>
                                            <span className="col-span-2 font-medium text-[var(--text-primary)]">{user.company.legalName}</span>
                                        </div>
                                    )}
                                    {user.company.gstin && (
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <span className="text-[var(--text-tertiary)]">GSTIN</span>
                                            <span className="col-span-2 font-mono text-[var(--text-primary)]">{user.company.gstin}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Account Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-2">
                                <Shield size={16} /> Account Security
                            </h3>
                            <div className="bg-[var(--bg-secondary)] rounded-lg p-5 space-y-3 border border-[var(--border-subtle)]">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <span className="text-[var(--text-tertiary)]">User ID</span>
                                    <span className="col-span-2 font-mono text-xs text-[var(--text-secondary)]">{user._id}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <span className="text-[var(--text-tertiary)]">Last Login</span>
                                    <span className="col-span-2 text-[var(--text-primary)]">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
