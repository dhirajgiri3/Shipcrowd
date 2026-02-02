/**
 * Promotion & Coupon Types
 */

export interface PromoCode {
    _id: string;
    code: string;
    companyId: string;
    discount: {
        type: 'percentage' | 'fixed';
        value: number;
    };
    validFrom: string;
    validUntil: string;
    restrictions: {
        minOrderValue?: number;
        maxDiscount?: number;
        usageLimit?: number;
        usageCount?: number;
        carriers?: string[];
        serviceTypes?: string[];
    };
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export type PromoCodeResponse = PromoCode[];

export interface PromoCodeFilters {
    active?: boolean;
    type?: 'percentage' | 'fixed';
    expired?: boolean;
}
