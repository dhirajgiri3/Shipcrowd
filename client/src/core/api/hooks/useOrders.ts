import { apiClient, ApiError } from '../client';
import { handleApiError, showSuccessToast } from '../errors/error-handler';
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
    UseMutationOptions,
} from '@tanstack/react-query';

// Types from generated API schema
export interface Order {
    _id: string;
    orderNumber: string;
    companyId: string;
    customerInfo: {
        name: string;
        email?: string;
        phone: string;
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
    currentStatus: 'pending' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'rto';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod: 'cod' | 'prepaid';
    totals: {
        subtotal: number;
        tax: number;
        shipping: number;
        discount: number;
        total: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface OrderFilters {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}

export interface OrdersResponse {
    orders: Order[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface CreateOrderPayload {
    customerInfo: Order['customerInfo'];
    products: Order['products'];
    paymentMethod?: 'cod' | 'prepaid';
    warehouseId?: string;
    notes?: string;
}

/**
 * Fetch paginated orders list
 */
export const useOrders = (filters: OrderFilters = {}, options?: UseQueryOptions<OrdersResponse, ApiError>) => {
    return useQuery<OrdersResponse, ApiError>({
        queryKey: ['orders', filters],
        queryFn: async () => {
            const response = await apiClient.get('/orders', { params: filters });
            return response.data;
        },
        staleTime: 30000, // 30 seconds
        ...options,
    });
};

/**
 * Fetch single order by ID
 */
export const useOrder = (orderId: string, options?: UseQueryOptions<Order, ApiError>) => {
    return useQuery<Order, ApiError>({
        queryKey: ['orders', orderId],
        queryFn: async () => {
            const response = await apiClient.get(`/orders/${orderId}`);
            return response.data.order;
        },
        enabled: !!orderId,
        staleTime: 30000,
        ...options,
    });
};

/**
 * Create new order with optimistic update
 */
export const useCreateOrder = (options?: UseMutationOptions<Order, ApiError, CreateOrderPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<Order, ApiError, CreateOrderPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/orders', payload);
            return response.data.order;
        },
        onSuccess: (data) => {
            // Invalidate orders list
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            showSuccessToast('Order created successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Create Order Failed');
        },
        ...options,
    });
};

/**
 * Update existing order
 */
export const useUpdateOrder = (options?: UseMutationOptions<Order, ApiError, { orderId: string; data: Partial<Order> }>) => {
    const queryClient = useQueryClient();

    return useMutation<Order, ApiError, { orderId: string; data: Partial<Order> }>({
        mutationFn: async ({ orderId, data }) => {
            const response = await apiClient.patch(`/orders/${orderId}`, data);
            return response.data.order;
        },
        onSuccess: (data, { orderId }) => {
            // Invalidate specific order and list
            queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            showSuccessToast('Order updated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Update Order Failed');
        },
        ...options,
    });
};

/**
 * Delete order (soft delete)
 */
export const useDeleteOrder = (options?: UseMutationOptions<void, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (orderId) => {
            await apiClient.delete(`/orders/${orderId}`);
        },
        onSuccess: (_, orderId) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            showSuccessToast('Order deleted successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Delete Order Failed');
        },
        ...options,
    });
};
