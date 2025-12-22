import { apiClient, ApiError } from '../../lib/api/client';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export interface SellerDashboardData {
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
    successRate: number;
    codPending: {
        count: number;
        amount: number;
    };
    recentShipments: Array<{
        _id: string;
        trackingNumber: string;
        carrier: string;
        currentStatus: string;
        createdAt: string;
    }>;
    weeklyTrend: Array<{
        date: string;
        orders: number;
        revenue: number;
    }>;
}

export interface AdminDashboardData {
    totalShipments: number;
    globalSuccessRate: number;
    ndrCases: number;
    totalRevenue: number;
    companies: Array<{
        _id: string;
        name: string;
        orderCount: number;
        gmv: number;
        successRate: number;
    }>;
    revenueTrend: Array<{
        date: string;
        revenue: number;
    }>;
}

export interface AnalyticsFilters {
    startDate?: string;
    endDate?: string;
}

/**
 * Fetch seller dashboard analytics
 */
export const useSellerDashboard = (filters: AnalyticsFilters = {}, options?: UseQueryOptions<SellerDashboardData, ApiError>) => {
    return useQuery<SellerDashboardData, ApiError>({
        queryKey: ['analytics', 'seller-dashboard', filters],
        queryFn: async () => {
            const response = await apiClient.get('/analytics/dashboard/seller', { params: filters });
            return response.data;
        },
        staleTime: 300000, // 5 minutes - aggressive caching for analytics
        refetchInterval: 30000, // Auto-refresh every 30 seconds
        ...options,
    });
};

/**
 * Fetch admin dashboard analytics (admin only)
 */
export const useAdminDashboard = (options?: UseQueryOptions<AdminDashboardData, ApiError>) => {
    return useQuery<AdminDashboardData, ApiError>({
        queryKey: ['analytics', 'admin-dashboard'],
        queryFn: async () => {
            const response = await apiClient.get('/analytics/dashboard/admin');
            return response.data;
        },
        staleTime: 300000, // 5 minutes
        refetchInterval: 60000, // Auto-refresh every 60 seconds
        // Client-side role check (server will also validate)
        enabled: typeof window !== 'undefined' && localStorage.getItem('user_role') === 'admin',
        ...options,
    });
};
