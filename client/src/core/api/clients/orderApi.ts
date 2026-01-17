/**
 * Order API Layer
 * All order endpoints with proper type safety
 */

import { apiClient } from '../config/client';
import type {
  Order,
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderResponse,
  GetOrdersResponse,
  UpdateOrderResponse,
  DeleteOrderResponse,
  OrderListParams,
} from '@/src/types/domain/order';

/**
 * Order API Service
 * Handles all order-related API calls
 */
class OrderApiService {
  /**
   * Create a new order
   * POST /api/v1/orders
   */
  async createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
    const response = await apiClient.post<CreateOrderResponse>('/orders', {
      customerInfo: {
        name: data.customerInfo.name,
        email: data.customerInfo.email || undefined,
        phone: data.customerInfo.phone,
        address: {
          line1: data.customerInfo.address.line1,
          line2: data.customerInfo.address.line2 || undefined,
          city: data.customerInfo.address.city,
          state: data.customerInfo.address.state,
          country: data.customerInfo.address.country,
          postalCode: data.customerInfo.address.postalCode,
        },
      },
      products: data.products.map((p) => ({
        name: p.name,
        sku: p.sku || undefined,
        quantity: Number(p.quantity),
        price: Number(p.price),
        weight: p.weight ? Number(p.weight) : undefined,
        dimensions: p.dimensions
          ? {
              length: Number(p.dimensions.length),
              width: Number(p.dimensions.width),
              height: Number(p.dimensions.height),
            }
          : undefined,
      })),
      paymentMethod: data.paymentMethod || 'cod',
      warehouseId: data.warehouseId || undefined,
      externalOrderNumber: data.externalOrderNumber || undefined,
      notes: data.notes || undefined,
      tags: data.tags || undefined,
    });

    return response.data;
  }

  /**
   * Get list of orders
   * GET /api/v1/orders
   */
  async getOrders(params?: OrderListParams): Promise<GetOrdersResponse> {
    const response = await apiClient.get<GetOrdersResponse>('/orders', { params });
    return response.data;
  }

  /**
   * Get single order by ID
   * GET /api/v1/orders/:id
   */
  async getOrder(orderId: string): Promise<GetOrderResponse> {
    const response = await apiClient.get<GetOrderResponse>(`/orders/${orderId}`);
    return response.data;
  }

  /**
   * Update an order
   * PATCH /api/v1/orders/:id
   */
  async updateOrder(
    orderId: string,
    data: Partial<CreateOrderRequest>
  ): Promise<UpdateOrderResponse> {
    const payload: any = {};

    // Only include fields that are provided
    if (data.customerInfo) {
      payload.customerInfo = {
        name: data.customerInfo.name,
        email: data.customerInfo.email || undefined,
        phone: data.customerInfo.phone,
        address: {
          line1: data.customerInfo.address.line1,
          line2: data.customerInfo.address.line2 || undefined,
          city: data.customerInfo.address.city,
          state: data.customerInfo.address.state,
          country: data.customerInfo.address.country,
          postalCode: data.customerInfo.address.postalCode,
        },
      };
    }

    if (data.products) {
      payload.products = data.products.map((p) => ({
        name: p.name,
        sku: p.sku || undefined,
        quantity: Number(p.quantity),
        price: Number(p.price),
        weight: p.weight ? Number(p.weight) : undefined,
        dimensions: p.dimensions
          ? {
              length: Number(p.dimensions.length),
              width: Number(p.dimensions.width),
              height: Number(p.dimensions.height),
            }
          : undefined,
      }));
    }

    if (data.paymentMethod) {
      payload.paymentMethod = data.paymentMethod;
    }

    if (data.warehouseId !== undefined) {
      payload.warehouseId = data.warehouseId;
    }

    if (data.externalOrderNumber !== undefined) {
      payload.externalOrderNumber = data.externalOrderNumber;
    }

    if (data.notes !== undefined) {
      payload.notes = data.notes;
    }

    if (data.tags !== undefined) {
      payload.tags = data.tags;
    }

    const response = await apiClient.patch<UpdateOrderResponse>(`/orders/${orderId}`, payload);
    return response.data;
  }

  /**
   * Delete an order
   * DELETE /api/v1/orders/:id
   */
  async deleteOrder(orderId: string): Promise<DeleteOrderResponse> {
    const response = await apiClient.delete<DeleteOrderResponse>(`/orders/${orderId}`);
    return response.data;
  }
}

/**
 * Singleton instance
 */
export const orderApi = new OrderApiService();

export default orderApi;
