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
    // Additional fields needed for UI but maybe not in core schema? 
    // Checking controller: createSalesRepSchema includes these.
    monthlyTarget?: number; // Optional in schema? Controller schema doesn't seem to have target in createSchema, but UI needs it. 
    // Wait, let's stick STRICTLY to controller schema I saw:
    // name, email, phone, territory, reportingTo, bankDetails, userId.
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
