import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
    UseMutationOptions
} from '@tanstack/react-query';
import { orderApi } from '../../clients/orders/orderApi';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';
import type {
    Order,
    CreateOrderRequest,
    OrderListParams,
    GetOrdersResponse,
    GetOrderResponse
} from '@/src/types/domain/order';

/**
 * React Query hook for fetching orders list with pagination
 * Uses centralized cache configuration with medium cache time
 */
export const useOrdersList = (
    params?: OrderListParams,
    options?: UseQueryOptions<GetOrdersResponse, ApiError>
) => {
    return useQuery<GetOrdersResponse, ApiError>({
        queryKey: queryKeys.orders.list(params),
        queryFn: async () => await orderApi.getOrders(params),
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * React Query hook for fetching a single order
 * Enabled only when orderId is provided
 */
export const useOrder = (
    orderId: string,
    options?: UseQueryOptions<GetOrderResponse, ApiError>
) => {
    return useQuery<GetOrderResponse, ApiError>({
        queryKey: queryKeys.orders.detail(orderId),
        queryFn: async () => await orderApi.getOrder(orderId),
        enabled: !!orderId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * React Query mutation hook for creating orders
 * Invalidates orders list and analytics after successful creation
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
            // Invalidate related caches
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast(`Order ${order.orderNumber} created successfully`);
        },
        onError: (error) => {
            handleApiError(error, 'Create Order Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * React Query mutation hook for updating orders
 * Uses optimistic update pattern to reduce UI flickering
 */
export const useUpdateOrder = (
    options?: UseMutationOptions<
        Order,
        ApiError,
        { orderId: string; data: Partial<CreateOrderRequest> },
        { previousData: any; orderId: string } // Add context type
    >
) => {
    const queryClient = useQueryClient();

    return useMutation<
        Order,
        ApiError,
        { orderId: string; data: Partial<CreateOrderRequest> },
        { previousData: any; orderId: string } // Add context type
    >({
        mutationFn: async ({ orderId, data }) => {
            const response = await orderApi.updateOrder(orderId, data);
            return response.data.order;
        },
        // Optimistic update: update UI immediately
        onMutate: async ({ orderId, data }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.orders.detail(orderId) });

            // Snapshot previous data
            const previousData = queryClient.getQueryData(queryKeys.orders.detail(orderId));

            // Optimistically update cache
            queryClient.setQueryData(queryKeys.orders.detail(orderId), (old: any) => ({
                ...old,
                data: { order: { ...old?.data?.order, ...data } }
            }));

            return { previousData, orderId };
        },
        onSuccess: (order, variables) => {
            // Invalidate related caches
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast('Order updated successfully');
        },
        onError: (error, variables, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(queryKeys.orders.detail(variables.orderId), context.previousData);
            }
            handleApiError(error, 'Update Order Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * React Query mutation hook for deleting orders
 * Removes query data after successful deletion
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
            // Invalidate related caches
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            // Remove specific order from cache
            queryClient.removeQueries({ queryKey: queryKeys.orders.detail(orderId) });
            showSuccessToast('Order deleted successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Delete Order Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * React Query mutation hook for cloning orders
 * Creates a duplicate order with optional modifications
 */
export const useCloneOrder = (
    options?: UseMutationOptions<
        { success: boolean; clonedOrder: Order; originalOrderNumber: string },
        ApiError,
        { orderId: string; modifications?: any }
    >
) => {
    const queryClient = useQueryClient();

    return useMutation<
        { success: boolean; clonedOrder: Order; originalOrderNumber: string },
        ApiError,
        { orderId: string; modifications?: any }
    >({
        mutationFn: async ({ orderId, modifications }) => {
            const response = await orderApi.cloneOrder(orderId, modifications);
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate related caches
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast(`Order cloned successfully. New order: ${data.clonedOrder.orderNumber}`);
        },
        onError: (error) => {
            handleApiError(error, 'Clone Order Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * React Query mutation hook for splitting orders
 * Splits a single order into multiple orders
 */
export const useSplitOrder = (
    options?: UseMutationOptions<
        {
            success: boolean;
            originalOrderNumber: string;
            splitOrders: Array<{ orderNumber: string; id: string; products: any[]; totals: any }>;
        },
        ApiError,
        {
            orderId: string;
            splits: Array<{
                products: Array<{ sku?: string; name: string; quantity: number }>;
                warehouseId?: string;
                notes?: string;
            }>;
        }
    >
) => {
    const queryClient = useQueryClient();

    return useMutation<
        {
            success: boolean;
            originalOrderNumber: string;
            splitOrders: Array<{ orderNumber: string; id: string; products: any[]; totals: any }>;
        },
        ApiError,
        {
            orderId: string;
            splits: Array<{
                products: Array<{ sku?: string; name: string; quantity: number }>;
                warehouseId?: string;
                notes?: string;
            }>;
        }
    >({
        mutationFn: async ({ orderId, splits }) => {
            const response = await orderApi.splitOrder(orderId, splits);
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate related caches
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast(
                `Order split into ${data.splitOrders.length} orders: ${data.splitOrders.map((o) => o.orderNumber).join(', ')}`
            );
        },
        onError: (error) => {
            handleApiError(error, 'Split Order Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * React Query mutation hook for merging orders
 * Merges multiple orders into a single order
 */
export const useMergeOrders = (
    options?: UseMutationOptions<
        {
            success: boolean;
            mergedOrder: { orderNumber: string; id: string; products: any[]; totals: any };
            cancelledOrders: string[];
        },
        ApiError,
        {
            orderIds: string[];
            mergeOptions?: {
                warehouseId?: string;
                paymentMethod?: string;
                notes?: string;
            };
        }
    >
) => {
    const queryClient = useQueryClient();

    return useMutation<
        {
            success: boolean;
            mergedOrder: { orderNumber: string; id: string; products: any[]; totals: any };
            cancelledOrders: string[];
        },
        ApiError,
        {
            orderIds: string[];
            mergeOptions?: {
                warehouseId?: string;
                paymentMethod?: string;
                notes?: string;
            };
        }
    >({
        mutationFn: async ({ orderIds, mergeOptions }) => {
            const response = await orderApi.mergeOrders(orderIds, mergeOptions);
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate related caches
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            // Remove cancelled orders from cache
            data.cancelledOrders.forEach((orderId) => {
                queryClient.removeQueries({ queryKey: queryKeys.orders.detail(orderId) });
            });
            showSuccessToast(
                `${data.cancelledOrders.length} orders merged into ${data.mergedOrder.orderNumber}`
            );
        },
        onError: (error) => {
            handleApiError(error, 'Merge Orders Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
