import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '../../http';
import { ApiError } from '../../http';

// Types
export interface AdminOrder {
    _id: string;
    orderNumber: string;
    companyId: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    currentStatus: string;
    paymentMethod: string;
    paymentStatus: string;
    customerInfo: {
        name: string;
        phone: string;
        email?: string;
        address: {
            line1: string;
            line2?: string;
            city: string;
            state: string;
            country: string;
            postalCode: string;
        };
    };
    products: Array<{
        name: string;
        sku?: string;
        quantity: number;
        price: number;
        weight?: number;
    }>;
    totals: {
        subtotal: number;
        tax?: number;
        shipping?: number;
        discount?: number;
        total: number;
    };
    warehouseId?: {
        _id: string;
        name: string;
        address: any;
    };
    createdAt: string;
    updatedAt: string;
}

export interface AdminOrdersParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    companyId?: string;
    warehouse?: string;
    phone?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface AdminOrdersResponse {
    data: AdminOrder[];
    pagination: {
        page: number;
        pages: number;
        total: number;
        limit: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    stats?: {
        totalOrders: number;
        pendingOrders: number;
        processingOrders: number;
        deliveredOrders: number;
    };
}

/**
 * Fetch all orders (Admin view)
 */
export const useAdminOrders = (
    params?: AdminOrdersParams,
    options?: Omit<UseQueryOptions<AdminOrdersResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<AdminOrdersResponse, ApiError>({
        queryKey: ['admin', 'orders', params],
        queryFn: async () => {
            const response = await apiClient.get('/admin/orders', { params });
            return response.data;
        },
        ...options,
    });
};

/**
 * Fetch single order by ID (Admin view)
 */
export const useAdminOrder = (
    orderId: string,
    options?: Omit<UseQueryOptions<{ order: AdminOrder }, ApiError>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<{ order: AdminOrder }, ApiError>({
        queryKey: ['admin', 'orders', orderId],
        queryFn: async () => {
            const response = await apiClient.get(`/admin/orders/${orderId}`);
            return response.data.data;
        },
        enabled: !!orderId,
        ...options,
    });
};

/**
 * Update order (Admin view)
 */
export const useUpdateAdminOrder = (
    options?: UseMutationOptions<any, ApiError, { orderId: string; data: Partial<AdminOrder> }>
) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { orderId: string; data: Partial<AdminOrder> }>({
        mutationFn: async ({ orderId, data }) => {
            const response = await apiClient.patch(`/admin/orders/${orderId}`, data);
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            // Invalidate both the list and the specific order
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders', variables.orderId] });
        },
        ...options,
    });
};

export default {
    useAdminOrders,
    useAdminOrder,
    useUpdateAdminOrder,
};
