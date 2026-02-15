
import { useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { PromoCode } from '@/src/types/domain/promotion';
import { Percent, IndianRupee } from 'lucide-react';
import { toEndOfDayIso, toStartOfDayIso } from '@/src/lib/utils/date';

interface CouponFormProps {
    initialData?: PromoCode | null;
    onClose: () => void;
    onSubmit: (data: Partial<PromoCode>) => void;
    isSubmitting: boolean;
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

export function CouponForm({ initialData, onClose, onSubmit, isSubmitting }: CouponFormProps) {
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
            validFrom: toStartOfDayIso(formData.validFrom),
            validUntil: formData.validUntil ? toEndOfDayIso(formData.validUntil) : undefined,
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
