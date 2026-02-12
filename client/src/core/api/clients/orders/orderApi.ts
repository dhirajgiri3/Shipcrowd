/**
 * Order API Layer
 * All order endpoints with proper type safety
 */

import { apiClient } from '@/src/core/api/http';
import type {
  Order,
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderResponse,
  GetOrdersResponse,
  UpdateOrderResponse,
  DeleteOrderResponse,
  OrderListParams,
  CourierRate,
  ShipOrderRequest,
  BulkShipOrdersRequest,
} from '@/src/types/domain/order';

type QuoteOptionsApiResponse = {
  success: boolean;
  data: {
    sessionId: string;
    expiresAt: string;
    recommendation?: string;
    confidence?: 'high' | 'medium' | 'low';
    options: Array<{
      optionId: string;
      provider: 'velocity' | 'delhivery' | 'ekart';
      serviceName: string;
      chargeableWeight: number;
      zone?: string;
      quotedAmount: number;
      costAmount: number;
      estimatedMargin: number;
      estimatedMarginPercent: number;
      confidence?: 'high' | 'medium' | 'low';
      pricingSource?: 'live' | 'table' | 'hybrid';
      tags?: string[];
      eta?: { maxDays?: number };
      sellBreakdown?: CourierRate['sellBreakdown'];
      costBreakdown?: CourierRate['costBreakdown'];
    }>;
  };
};

/**
 * Order API Service
 * Handles all order-related API calls
 */
export const orderApi = {
  /**
   * Create a new order
   * POST /api/v1/orders
   */
  createOrder: async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
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
  },

  /**
   * Get list of orders
   * GET /api/v1/orders
   */
  getOrders: async (params?: OrderListParams): Promise<GetOrdersResponse> => {
    const response = await apiClient.get<GetOrdersResponse>('/orders', { params });
    return response.data;
  },

  /**
   * Get single order by ID
   * GET /api/v1/orders/:id
   */
  getOrder: async (orderId: string): Promise<GetOrderResponse> => {
    const response = await apiClient.get<GetOrderResponse>(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Update an order
   * PATCH /api/v1/orders/:id
   */
  updateOrder: async (
    orderId: string,
    data: Partial<CreateOrderRequest>
  ): Promise<UpdateOrderResponse> => {
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
  },

  /**
   * Delete an order
   * DELETE /api/v1/orders/:id
   */
  deleteOrder: async (orderId: string): Promise<DeleteOrderResponse> => {
    const response = await apiClient.delete<DeleteOrderResponse>(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Clone an existing order with optional modifications
   * POST /api/v1/orders/:id/clone
   */
  cloneOrder: async (
    orderId: string,
    modifications?: {
      customerInfo?: any;
      products?: any[];
      paymentMethod?: string;
      warehouseId?: string;
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    data: {
      success: boolean;
      clonedOrder: Order;
      originalOrderNumber: string;
    };
  }> => {
    const response = await apiClient.post(`/orders/${orderId}/clone`, {
      modifications,
    });
    return response.data;
  },

  /**
   * Split a single order into multiple orders
   * POST /api/v1/orders/:id/split
   */
  splitOrder: async (
    orderId: string,
    splits: Array<{
      products: Array<{ sku?: string; name: string; quantity: number }>;
      warehouseId?: string;
      notes?: string;
    }>
  ): Promise<{
    success: boolean;
    data: {
      success: boolean;
      originalOrderNumber: string;
      splitOrders: Array<{
        orderNumber: string;
        id: string;
        products: any[];
        totals: any;
      }>;
    };
  }> => {
    const response = await apiClient.post(`/orders/${orderId}/split`, {
      splits,
    });
    return response.data;
  },

  /**
   * Merge multiple orders into a single order
   * POST /api/v1/orders/merge
   */
  mergeOrders: async (
    orderIds: string[],
    mergeOptions?: {
      warehouseId?: string;
      paymentMethod?: string;
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    data: {
      success: boolean;
      mergedOrder: {
        orderNumber: string;
        id: string;
        products: any[];
        totals: any;
      };
      cancelledOrders: string[];
    };
  }> => {
    const response = await apiClient.post('/orders/merge', {
      orderIds,
      mergeOptions,
    });
    return response.data;
  },

  // ============================================================================
  // SHIPPING & COURIER METHODS (Seller + Admin)
  // ============================================================================

  /**
   * Get courier rates for shipping
   * GET /api/v1/orders/courier-rates
   */
  getCourierRates: async (params: {
    fromPincode: string;
    toPincode: string;
    weight: number;
    paymentMode?: 'COD' | 'Prepaid' | 'cod' | 'prepaid';
    orderValue?: number;
    length?: number;
    width?: number;
    height?: number;
  }): Promise<{ success: boolean; data: CourierRate[] }> => {
    const response = await apiClient.get('/orders/courier-rates', { params });
    const payload = response.data as QuoteOptionsApiResponse | { success: boolean; data: CourierRate[] };

    if (Array.isArray((payload as { data: CourierRate[] }).data)) {
      return payload as { success: boolean; data: CourierRate[] };
    }

    const quotePayload = payload as QuoteOptionsApiResponse;
    const quoteData = quotePayload.data;
    const rates: CourierRate[] = (quoteData.options || []).map((option) => {
      const normalizedService = (option.serviceName || '').toLowerCase();
      const serviceType = normalizedService.includes('express') || normalizedService.includes('air')
        ? 'express'
        : 'standard';

      return {
        courierId: option.provider,
        courierName: option.serviceName,
        serviceType,
        rate: Number(option.quotedAmount || 0),
        estimatedDeliveryDays: Number(option.eta?.maxDays || 0),
        provider: option.provider,
        serviceName: option.serviceName,
        quotedAmount: Number(option.quotedAmount || 0),
        costAmount: Number(option.costAmount || 0),
        estimatedMargin: Number(option.estimatedMargin || 0),
        estimatedMarginPercent: Number(option.estimatedMarginPercent || 0),
        chargeableWeight: Number(option.chargeableWeight || 0),
        pricingSource: option.pricingSource || 'table',
        zone: option.zone,
        sessionId: quoteData.sessionId,
        optionId: option.optionId,
        expiresAt: quoteData.expiresAt,
        recommendation: quoteData.recommendation,
        isRecommended: option.optionId === quoteData.recommendation,
        confidence: option.confidence || quoteData.confidence || 'medium',
        tags: option.tags || [],
        sellBreakdown: option.sellBreakdown,
        costBreakdown: option.costBreakdown,
      };
    });

    return { success: quotePayload.success, data: rates };
  },

  /**
   * Ship an order
   * POST /api/v1/orders/:id/ship
   */
  shipOrder: async (data: ShipOrderRequest): Promise<{
    success: boolean;
    data: Record<string, unknown>;
    message: string;
  }> => {
    const { orderId, ...payload } = data;
    const response = await apiClient.post(`/orders/${orderId}/ship`, payload);
    return response.data;
  },

  /**
   * Bulk import orders from CSV file
   * POST /api/v1/orders/bulk
   */
  bulkImportOrders: async (file: File): Promise<{
    success: boolean;
    data: {
      created: Array<{ orderNumber: string; id: string }>;
      errors: Array<{ row: number; error: string }>;
      imported: number;
      failed: number;
    };
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/orders/bulk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // ============================================================================
  // ADMIN-ONLY METHODS
  // ============================================================================

  /**
   * Get all orders across sellers (Admin only)
   * GET /api/v1/admin/orders
   */
  getAdminOrders: async (params?: OrderListParams): Promise<GetOrdersResponse> => {
    const response = await apiClient.get<GetOrdersResponse>('/admin/orders', { params });
    return response.data;
  },

  /**
   * Bulk ship multiple orders (Admin only)
   * POST /api/v1/admin/orders/bulk-ship
   */
  bulkShipOrders: async (data: BulkShipOrdersRequest): Promise<{
    success: boolean;
    data: {
      successful: Array<{ orderId: string; awbNumber: string }>;
      failed: Array<{ orderId: string; reason: string }>;
    };
  }> => {
    const response = await apiClient.post('/admin/orders/bulk-ship', data);
    return response.data;
  },
};

export default orderApi;
