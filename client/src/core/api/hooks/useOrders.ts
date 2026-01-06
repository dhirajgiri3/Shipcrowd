import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
    UseMutationOptions
} from '@tanstack/react-query';
import { orderApi } from '../order.api';
import { handleApiError, showSuccessToast } from '@/lib/error-handler';
import { ApiError } from '../client';
import type {
    Order,
    CreateOrderRequest,
    OrderListParams,
    GetOrdersResponse,
    GetOrderResponse
} from '@/src/types/order';

/**
 * React Query hook for fetching orders list with pagination
 */
export const useOrdersList = (
    params?: OrderListParams,
    options?: UseQueryOptions<GetOrdersResponse, ApiError>
) => {
    return useQuery<GetOrdersResponse, ApiError>({
        queryKey: ['orders', params],
        queryFn: async () => await orderApi.getOrders(params),
        staleTime: 30000, // 30 seconds
        ...options,
    });
};

/**
 * React Query hook for fetching a single order
 */
export const useOrder = (
    orderId: string,
    options?: UseQueryOptions<GetOrderResponse, ApiError>
) => {
    return useQuery<GetOrderResponse, ApiError>({
        queryKey: ['orders', orderId],
        queryFn: async () => await orderApi.getOrder(orderId),
        enabled: !!orderId,
        staleTime: 60000, // 1 minute
        ...options,
    });
};

/**
 * React Query mutation hook for creating orders
 */
export const useCreateOrder = (
    options?: UseMutationOptions<Order, ApiError, CreateOrderRequest>
) => {
    const queryClient = useQueryClient();

    return useMutation<Order, ApiError, CreateOrderRequest>({
        mutationFn: async (data) => {
            const response = await orderApi.createOrder(data);
            return response.data.order;
        },
        onSuccess: (order) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            showSuccessToast(`Order ${order.orderNumber} created successfully`);
        },
        onError: (error) => {
            handleApiError(error, 'Create Order Failed');
        },
        ...options,
    });
};

/**
 * React Query mutation hook for updating orders
 */
export const useUpdateOrder = (
    options?: UseMutationOptions<
        Order,
        ApiError,
        { orderId: string; data: Partial<CreateOrderRequest> }
    >
) => {
    const queryClient = useQueryClient();

    return useMutation<
        Order,
        ApiError,
        { orderId: string; data: Partial<CreateOrderRequest> }
    >({
        mutationFn: async ({ orderId, data }) => {
            const response = await orderApi.updateOrder(orderId, data);
            return response.data.order;
        },
        onSuccess: (order, variables) => {
            queryClient.setQueryData(['orders', variables.orderId], (old: any) => ({
                ...old,
                data: { order }
            }));
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
 * React Query mutation hook for deleting orders
 */
export const useDeleteOrder = (
    options?: UseMutationOptions<void, ApiError, string>
) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (orderId) => {
            await orderApi.deleteOrder(orderId);
        },
        onSuccess: (_, orderId) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.removeQueries({ queryKey: ['orders', orderId] });
            showSuccessToast('Order deleted successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Delete Order Failed');
        },
        ...options,
    });
};
