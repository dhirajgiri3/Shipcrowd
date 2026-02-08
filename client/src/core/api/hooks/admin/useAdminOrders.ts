/**
 * Admin Orders Hooks
 * Extends existing order hooks with admin-specific functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../clients/orders/orderApi';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';
import type { GetOrdersResponse, OrderListParams, CourierRate, ShipOrderRequest, BulkShipOrdersRequest } from '@/src/types/domain/order';

/**
 * Get all orders across all sellers (Admin only)
 * Reuses existing order list but with admin endpoint
 */
export const useAdminOrders = (params?: OrderListParams) => {
  return useQuery<GetOrdersResponse, ApiError>({
    queryKey: queryKeys.admin.orders.list(params),
    queryFn: async () => await orderApi.getAdminOrders(params),
    ...CACHE_TIMES.MEDIUM,
    retry: RETRY_CONFIG.DEFAULT,
  });
};

/**
 * Get courier rates for shipping
 * Works for both admin and seller
 */
export const useGetCourierRates = () => {
  return useMutation<
    { success: boolean; data: CourierRate[] },
    ApiError,
    {
      fromPincode: string;
      toPincode: string;
      weight: number;
      paymentMode?: 'COD' | 'Prepaid';
      orderValue?: number;
      length?: number;
      width?: number;
      height?: number;
    }
  >({
    mutationFn: async (params) => await orderApi.getCourierRates(params),
    onError: (error) => {
      handleApiError(error, 'Failed to fetch courier rates');
    },
  });
};

/**
 * Ship a single order
 * Works for both admin and seller
 */
export const useShipOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; data: Record<string, unknown>; message: string },
    ApiError,
    ShipOrderRequest
  >({
    mutationFn: async (data) => await orderApi.shipOrder(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all() });
    },
    onError: (error) => {
      handleApiError(error, 'Failed to create shipment');
    },
  });
};

/**
 * Bulk ship multiple orders (Admin only)
 */
export const useBulkShipOrders = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; data: { successful: Array<{ orderId: string; awbNumber: string }>; failed: Array<{ orderId: string; reason: string }> } },
    ApiError,
    BulkShipOrdersRequest
  >({
    mutationFn: async (data) => await orderApi.bulkShipOrders(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all() });
    },
    onError: (error) => {
      handleApiError(error, 'Bulk shipment failed');
    },
  });
};

/**
 * Delete an order (Admin only)
 */
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: true; message: string },
    ApiError,
    string
  >({
    mutationFn: async (orderId) => await orderApi.deleteOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.all() });
    },
    onError: (error) => {
      handleApiError(error, 'Failed to delete order');
    },
  });
};
