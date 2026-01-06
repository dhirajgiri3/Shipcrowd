/**
 * Order Type Definitions
 * Aligned with backend Order model and API contracts
 */

/**
 * Product item in order
 */
export interface OrderProduct {
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

/**
 * Customer information
 */
export interface CustomerInfo {
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
}

/**
 * Shipping details
 */
export interface ShippingDetails {
  provider?: string;
  method?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  shippingCost: number;
}

/**
 * Order totals (auto-calculated by backend)
 */
export interface OrderTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

/**
 * Status history entry
 */
export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  comment?: string;
  updatedBy?: string;
}

/**
 * Complete Order object (from backend)
 * Matches backend Order model
 */
export interface Order {
  _id: string;
  orderNumber: string;
  companyId: string;

  customerInfo: CustomerInfo;
  products: OrderProduct[];

  shippingDetails: ShippingDetails;

  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'cod' | 'prepaid';

  source: 'manual' | 'shopify' | 'woocommerce' | 'flipkart' | 'amazon' | 'api';
  sourceId?: string;
  externalOrderNumber?: string;

  warehouseId?: string;

  // Dynamic status string - not enum
  currentStatus: string;
  statusHistory: StatusHistoryEntry[];

  // Backend calculates this
  totals: OrderTotals;

  notes?: string;
  tags?: string[];
  isDeleted: boolean;

  createdAt: string;
  updatedAt: string;
  __v: number;
}

/**
 * Create Order Request
 * Sent from frontend to backend
 * Note: Backend auto-calculates totals, so we don't send them
 */
export interface CreateOrderRequest {
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
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
  }>;
  paymentMethod?: 'cod' | 'prepaid';
  warehouseId?: string;
  notes?: string;
  tags?: string[];
  externalOrderNumber?: string;
}

/**
 * Order API Response Formats
 */

export interface CreateOrderResponse {
  success: true;
  message: string;
  data: {
    order: Order;
  };
}

export interface GetOrderResponse {
  success: true;
  message: string;
  data: {
    order: Order;
  };
}

export interface GetOrdersResponse {
  success: true;
  message: string;
  data: {
    orders: Order[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface UpdateOrderResponse {
  success: true;
  message: string;
  data: {
    order: Order;
  };
}

export interface DeleteOrderResponse {
  success: true;
  message: string;
}

/**
 * Order list query parameters
 */
export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  warehouseId?: string;
  search?: string; // Search by order number or customer name/phone
}

/**
 * Order Context Type
 */
export interface OrderContextType {
  // State
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createOrder: (data: CreateOrderRequest) => Promise<{ success: boolean; order?: Order; error?: string }>;
  getOrders: (params?: OrderListParams) => Promise<void>;
  getOrder: (orderId: string) => Promise<void>;
  updateOrder: (orderId: string, data: Partial<CreateOrderRequest>) => Promise<{ success: boolean; order?: Order; error?: string }>;
  deleteOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

/**
 * Form data type for order creation (frontend form state)
 */
export interface OrderFormData {
  // Customer
  customerName: string;
  customerEmail?: string;
  customerPhone: string;

  // Address
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;

  // Products (array of products)
  products: Array<{
    id: string; // Local ID for form
    name: string;
    sku?: string;
    quantity: number;
    price: number;
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
  }>;

  // Shipping & Payment
  warehouseId?: string;
  paymentMethod: 'cod' | 'prepaid';
  externalOrderNumber?: string;
  notes?: string;
  tags?: string;

  // Calculated totals (for preview only, not sent to backend)
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

/**
 * Order calculation utilities
 */
export interface OrderCalculation {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}
