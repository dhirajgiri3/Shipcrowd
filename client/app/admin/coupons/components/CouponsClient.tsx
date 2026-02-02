"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import {
    Ticket,
    Plus,
    Search,
    Copy,
    Edit2,
    Trash2,
    Calendar,
    Users,
    IndianRupee,
    Percent,
    X,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/lib/utils';
import { useAdminCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from '@/src/core/api/hooks/admin/coupons/useAdminCoupons';
import { PromoCode } from '@/src/types/domain/promotion';
import { format } from 'date-fns';

export function CouponsClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'expired'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<PromoCode | null>(null);

    const { addToast } = useToast();

    // API Hooks
    const { data: coupons = [], isLoading } = useAdminCoupons();

    // Mutations
    const createMutation = useCreateCoupon();
    const updateMutation = useUpdateCoupon();
    const deleteMutation = useDeleteCoupon();

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this coupon?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdit = (coupon: PromoCode) => {
        setEditingCoupon(coupon);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingCoupon(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingCoupon(null);
    };

    const handleFormSubmit = (data: Partial<PromoCode>) => {
        const mutation = editingCoupon ? updateMutation : createMutation;

        const payload = editingCoupon ? { id: editingCoupon._id, payload: data } : data;

        // @ts-ignore - Mutations have different signatures but we handle it
        mutation.mutate(payload, {
            onSuccess: () => {
                handleModalClose();
            }
        });
    };

    // Derived State
    const filteredCoupons = coupons.filter(coupon => {
        const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = true;
        const isExpired = new Date(coupon.validUntil) < new Date();
        const isActive = coupon.isActive && !isExpired;

        if (selectedStatus === 'active') {
            matchesStatus = isActive;
        } else if (selectedStatus === 'expired') {
            matchesStatus = isExpired || !coupon.isActive;
        }

        return matchesSearch && matchesStatus;
    });

    const activeCount = coupons.filter(c => c.isActive && new Date(c.validUntil) > new Date()).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.restrictions.usageCount || 0), 0);

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        addToast(`Copied: ${code}`, 'success');
    };

    const getBonusStatus = (coupon: PromoCode) => {
        const isExpired = new Date(coupon.validUntil) < new Date();
        if (isExpired) return 'expired';
        return coupon.isActive ? 'active' : 'inactive';
    };

    if (isLoading) {
        return <Loader message="Loading coupons..." />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <Ticket className="h-6 w-6 text-[var(--primary-blue)]" />
                        Coupons & Promotions
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
                        Manage discount codes and promotional offers
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Total Coupons</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{coupons.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--primary-blue-soft)]">
                                <Ticket className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Active</p>
                                <p className="text-2xl font-bold text-[var(--success)]">{activeCount}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--success-bg)]">
                                <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Total Redemptions</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{totalRedemptions}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--info-bg)]">
                                <Users className="h-5 w-5 text-[var(--info)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 bg-[var(--bg-secondary)] p-1 rounded-lg">
                    {(['all', 'active', 'expired'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all capitalize",
                                selectedStatus === status
                                    ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <div className="w-full sm:w-72">
                    <Input
                        placeholder="Search coupons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search className="h-4 w-4" />}
                    />
                </div>
            </div>

            {/* Content */}
            {filteredCoupons.length === 0 ? (
                <EmptyState
                    icon={<Ticket className="w-12 h-12" />}
                    title="No coupons found"
                    description={searchQuery ? "Try adjusting your search terms" : "Create your first coupon to get started"}
                    action={
                        !searchQuery ? {
                            label: 'Create Coupon',
                            onClick: handleCreate,
                            icon: <Plus className="h-4 w-4" />
                        } : undefined
                    }
                />
            ) : (
                <Card>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b border-[var(--border-subtle)]">
                                <tr className="border-b transition-colors hover:bg-[var(--bg-muted)]/50 data-[state=selected]:bg-[var(--bg-muted)]">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-[var(--text-muted)]">Code</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-[var(--text-muted)]">Discount</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-[var(--text-muted)]">Min Order</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-[var(--text-muted)]">Usage</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-[var(--text-muted)]">Validity</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-[var(--text-muted)]">Status</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-[var(--text-muted)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {filteredCoupons.map((coupon) => (
                                    <tr key={coupon._id} className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted)]/50">
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                <code className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-sm font-mono font-semibold text-[var(--text-primary)]">
                                                    {coupon.code}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(coupon.code)}
                                                    className="p-1 hover:bg-[var(--bg-active)] rounded transition-colors"
                                                >
                                                    <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1">
                                                    {coupon.discount.type === 'percentage' ? (
                                                        <>
                                                            <Percent className="h-4 w-4 text-[var(--primary-blue)]" />
                                                            <span className="font-medium text-[var(--text-primary)]">{coupon.discount.value}%</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <IndianRupee className="h-4 w-4 text-[var(--primary-blue)]" />
                                                            <span className="font-medium text-[var(--text-primary)]">{coupon.discount.value}</span>
                                                        </>
                                                    )}
                                                </div>
                                                {coupon.restrictions.maxDiscount && (
                                                    <span className="text-xs text-[var(--text-muted)]">Max: ₹{coupon.restrictions.maxDiscount}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <span className="text-[var(--text-primary)]">{formatCurrency(coupon.restrictions.minOrderValue || 0)}</span>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[var(--text-primary)]">{coupon.restrictions.usageCount || 0}</span>
                                                {coupon.restrictions.usageLimit && (
                                                    <span className="text-[var(--text-muted)]">/ {coupon.restrictions.usageLimit}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex flex-col text-sm">
                                                <span className="text-[var(--text-primary)]">{format(new Date(coupon.validFrom), 'dd MMM yyyy')}</span>
                                                <span className="text-xs text-[var(--text-muted)]">to {format(new Date(coupon.validUntil), 'dd MMM yyyy')}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <StatusBadge
                                                domain="coupon"
                                                status={getBonusStatus(coupon)}
                                            />
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(coupon)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-[var(--error)] hover:text-[var(--error)] hover:bg-[var(--error-bg)]"
                                                    onClick={() => handleDelete(coupon._id)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                title={editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
            >
                <CouponForm
                    initialData={editingCoupon}
                    onClose={handleModalClose}
                    onSubmit={handleFormSubmit}
                    isSubmitting={createMutation.isPending || updateMutation.isPending}
                />
            </Modal>
        </div>
    );
}

interface CouponFormData {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: string | number;
    minOrderValue: string | number;
    maxDiscount: string | number;
    usageLimit: string | number;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
}

interface CouponFormProps {
    initialData?: PromoCode | null;
    onClose: () => void;
    onSubmit: (data: Partial<PromoCode>) => void;
    isSubmitting: boolean;
}

function CouponForm({ initialData, onClose, onSubmit, isSubmitting }: CouponFormProps) {
    const [formData, setFormData] = useState<CouponFormData>({
        code: initialData?.code || '',
        discountType: initialData?.discount?.type || 'percentage',
        discountValue: initialData?.discount?.value || '',
        minOrderValue: initialData?.restrictions?.minOrderValue || '',
        maxDiscount: initialData?.restrictions?.maxDiscount || '',
        usageLimit: initialData?.restrictions?.usageLimit || '',
        validFrom: initialData?.validFrom ? new Date(initialData.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        validUntil: initialData?.validUntil ? new Date(initialData.validUntil).toISOString().split('T')[0] : '',
        isActive: initialData?.isActive ?? true,
    });

    const handleSubmit = () => {
        const payload: Partial<PromoCode> = {
            code: formData.code,
            discount: {
                type: formData.discountType,
                value: Number(formData.discountValue),
            },
            restrictions: {
                minOrderValue: Number(formData.minOrderValue) || 0,
                maxDiscount: Number(formData.maxDiscount) || undefined,
                usageLimit: Number(formData.usageLimit) || undefined,
            },
            validFrom: new Date(formData.validFrom).toISOString(),
            validUntil: new Date(formData.validUntil).toISOString(),
            isActive: formData.isActive,
        };
        onSubmit(payload);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Coupon Code <span className="text-red-500">*</span></label>
                    <Input
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="uppercase"
                        placeholder="SUMMER2025"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                        value={formData.isActive ? 'active' : 'inactive'}
                        onChange={e => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                        className="flex h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Discount Type</label>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={formData.discountType === 'percentage' ? 'primary' : 'outline'}
                            onClick={() => setFormData({ ...formData, discountType: 'percentage' })}
                            className="flex-1"
                        >
                            Percentage (%)
                        </Button>
                        <Button
                            type="button"
                            variant={formData.discountType === 'fixed' ? 'primary' : 'outline'}
                            onClick={() => setFormData({ ...formData, discountType: 'fixed' })}
                            className="flex-1"
                        >
                            Fixed Amount (₹)
                        </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Discount Value</label>
                    <Input
                        type="number"
                        value={formData.discountValue}
                        onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                        icon={formData.discountType === 'percentage' ? <Percent className="h-4 w-4" /> : <IndianRupee className="h-4 w-4" />}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Usage Restrictions</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <span className="text-xs text-[var(--text-muted)] block mb-1">Min Order Value</span>
                        <Input
                            type="number"
                            placeholder="0"
                            value={formData.minOrderValue}
                            onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })}
                            icon={<IndianRupee className="h-3 w-3" />}
                        />
                    </div>
                    <div>
                        <span className="text-xs text-[var(--text-muted)] block mb-1">Max Discount</span>
                        <Input
                            type="number"
                            placeholder="Unlimited"
                            value={formData.maxDiscount}
                            onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })}
                            disabled={formData.discountType === 'fixed'}
                        />
                    </div>
                    <div>
                        <span className="text-xs text-[var(--text-muted)] block mb-1">Usage Limit</span>
                        <Input
                            type="number"
                            placeholder="Unlimited"
                            value={formData.usageLimit}
                            onChange={e => setFormData({ ...formData, usageLimit: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Valid From</label>
                    <Input
                        type="date"
                        value={formData.validFrom}
                        onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Valid Until</label>
                    <Input
                        type="date"
                        value={formData.validUntil}
                        onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)] mt-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (initialData ? 'Update Coupon' : 'Create Coupon')}
                </Button>
            </div>
        </div>
    );
}
