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

export interface OrderWarehouseRef {
  _id?: string;
  id?: string;
  name?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
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
  baseCurrencySubtotal?: number;
  baseCurrencyTax?: number;
  baseCurrencyShipping?: number;
  baseCurrencyTotal?: number;
  baseCurrency?: string;
  exchangeRate?: number;
  exchangeRateDate?: string;
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

  warehouseId?: string | OrderWarehouseRef | null;

  // Dynamic status string - not enum
  currentStatus: string;
  statusHistory: StatusHistoryEntry[];

  /** True when order has an associated shipment (computed by backend) */
  hasShipment?: boolean;

  /** ISO 4217 currency code (e.g., 'USD', 'INR'). Defaults to 'INR'. */
  currency?: string;

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
  message?: string;
  data: Order[]; // Backend uses sendPaginated which puts array directly in data
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  stats?: Record<string, number>; // Faceted search stats
  filterCounts?: {
    all: number;
    needs_attention: number;
    today: number;
    cod_pending: number;
    last_7_days: number;
    zone_b: number;
  };
  globalStats?: {
    totalOrders: number;
    totalRevenue: number;
    pendingShipments: number;
    pendingPayments: number;
  };
  timestamp: string;
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
  warehouse?: string;
  search?: string; // Search by order number or customer name/phone
  source?: string; // Order source: manual, shopify, woocommerce, amazon, flipkart, api, bulk_import
  smartFilter?: 'all' | 'needs_attention' | 'today' | 'cod_pending' | 'last_7_days' | 'zone_b'; // Smart filter preset
  paymentStatus?: 'all' | 'paid' | 'pending' | 'failed'; // Payment status filter
  // Admin-specific filters
  sellerId?: string; // Filter by seller (admin only)
  paymentMode?: 'COD' | 'Prepaid';
  courierPartner?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Courier Rate for shipping
 */
export interface CourierRate {
  courierId: string;
  courierName: string;
  serviceType: string;
  rate: number;
  estimatedDeliveryDays: number;
  provider?: 'velocity' | 'delhivery' | 'ekart';
  serviceName?: string;
  quotedAmount?: number;
  costAmount?: number;
  estimatedMargin?: number;
  estimatedMarginPercent?: number;
  chargeableWeight?: number;
  pricingSource?: 'live' | 'table' | 'hybrid';
  zone?: string;
  rating?: { average: number; totalReviews: number };
  sessionId?: string;
  optionId?: string;
  expiresAt?: string;
  recommendation?: string;
  isRecommended?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  tags?: string[];
  sellBreakdown?: {
    baseCharge?: number;
    weightCharge?: number;
    subtotal?: number;
    codCharge?: number;
    fuelCharge?: number;
    rtoCharge?: number;
    gst?: number;
    total?: number;
  };
  costBreakdown?: {
    baseCharge?: number;
    weightCharge?: number;
    subtotal?: number;
    codCharge?: number;
    fuelCharge?: number;
    rtoCharge?: number;
    gst?: number;
    total?: number;
  };
  performanceMetrics?: {
    deliverySuccessRate: number;
    rtoRate: number;
    dataSource: 'route' | 'courier' | 'default';
  };
  recommendationReason?: string;
}

/**
 * Ship order request
 */
export interface ShipOrderRequest {
  orderId: string;
  courierId: string;
  serviceType: string;
  sessionId?: string;
  optionId?: string;
  pickupSchedule?: {
    date: string;
    timeSlot: 'morning' | 'afternoon' | 'evening';
  };
  specialInstructions?: string;
}

/**
 * Bulk ship orders request (admin only)
 */
export interface BulkShipOrdersRequest {
  orderIds: string[];
  courierId: string;
  serviceType: string;
  pickupSchedule?: {
    date: string;
    timeSlot: 'morning' | 'afternoon' | 'evening';
  };
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
