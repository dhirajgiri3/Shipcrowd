export interface BankDetails {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
}

export interface SalesRep {
    id: string; // Mapped from _id
    name: string;
    email: string;
    phone: string;
    territory: string;
    status: 'active' | 'inactive';
    availabilityStatus?: 'available' | 'busy' | 'offline';
    reportingTo?: string;
    // Computed/Performance metrics
    sellersOnboarded?: number;
    monthlyTarget?: number;
    monthlyAchieved?: number;
    totalRevenue?: number;
    commission?: number;
    rating?: number;
    joinedAt: string;
    bankDetails?: BankDetails;
}

export interface CreateSalesRepPayload {
    name: string;
    email: string;
    phone: string;
    territory: string;
    reportingTo?: string;
    bankDetails: BankDetails;
    monthlyTarget?: number;
    commissionRate?: number;
}

export interface UpdateSalesRepPayload {
    name?: string;
    email?: string;
    phone?: string;
    territory?: string;
    status?: 'active' | 'inactive';
    availabilityStatus?: 'available' | 'busy' | 'offline';
    reportingTo?: string;
    bankDetails?: BankDetails;
}

export interface SalesRepListFilter {
    page?: number;
    limit?: number;
    territory?: string;
    status?: 'active' | 'inactive';
}

export interface SalesRepListResponse {
    reps: SalesRep[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface SalesRepPerformance {
    id: string;
    sellersOnboarded: number;
    monthlyTarget: number;
    monthlyAchieved: number;
    totalRevenue: number;
    commission: number;
    achievementRate: number;
}
