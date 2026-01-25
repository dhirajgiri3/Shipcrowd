/**
 * Channel Mappers
 *
 * Purpose: Centralized data transformation utilities for e-commerce platform integrations.
 * Provides consistent mapping between Shopify/WooCommerce data formats and Shipcrowd models.
 *
 * FEATURES:
 * - Shopify order → Shipcrowd order mapping
 * - WooCommerce order → Shipcrowd order mapping
 * - Shipcrowd shipment → Platform fulfillment mapping
 * - Status mapping between platforms
 * - Address normalization
 * - Payment method detection
 *
 * USAGE:
 * ```typescript
 * import { ShopifyOrderMapper, WooCommerceOrderMapper, FulfillmentMapper } from './channel-mappers';
 *
 * // Convert Shopify order to Shipcrowd format
 * const ShipcrowdOrder = ShopifyOrderMapper.toShipcrowd(shopifyOrder, store);
 *
 * // Convert Shipcrowd shipment to Shopify fulfillment
 * const fulfillmentPayload = FulfillmentMapper.toShopifyFulfillment(shipment, order);
 * ```
 */

/**
 * Common address structure
 */
interface NormalizedAddress {
    line1: string;
    line2: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    phone?: string;
}

/**
 * Common order product structure
 */
interface NormalizedProduct {
    name: string;
    sku: string;
    quantity: number;
    price: number;
    weight?: number;
    imageUrl?: string;
}

/**
 * Common order totals structure
 */
interface NormalizedTotals {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
}

/**
 * Shipcrowd order format (target format)
 */
interface ShipcrowdOrderData {
    orderNumber: string;
    companyId: any;
    source: string;
    sourceId: string;
    externalOrderNumber?: string;
    customerInfo: {
        name: string;
        email: string;
        phone: string;
        address: NormalizedAddress;
    };
    products: NormalizedProduct[];
    shippingDetails: {
        shippingCost: number;
        provider?: string;
        shippingMethod?: string;
    };
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod: 'cod' | 'prepaid';
    currentStatus: string;
    totals: NormalizedTotals;
    notes: string;
    tags: string[];
    statusHistory: Array<{
        status: string;
        timestamp: Date;
        comment: string;
    }>;
    createdAt?: Date;
    updatedAt?: Date;
}

// =============================================================================
// SHOPIFY ORDER MAPPER
// =============================================================================

/**
 * Shopify order structure (source format)
 */
interface ShopifyOrderData {
    id: number;
    name: string;
    order_number: number;
    created_at: string;
    updated_at: string;
    financial_status: string;
    fulfillment_status: string | null;
    customer: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    billing_address?: {
        address1: string;
        address2?: string;
        city: string;
        province: string;
        country: string;
        zip: string;
        phone?: string;
    };
    shipping_address?: {
        first_name?: string;
        last_name?: string;
        address1: string;
        address2?: string;
        city: string;
        province: string;
        country: string;
        zip: string;
        phone?: string;
    };
    line_items: Array<{
        id: number;
        title: string;
        sku: string;
        quantity: number;
        price: string;
        grams: number;
        variant_title?: string;
        product_id?: number;
    }>;
    total_line_items_price: string;
    total_tax: string;
    total_shipping_price_set?: {
        shop_money: { amount: string };
    };
    total_discounts: string;
    total_price: string;
    subtotal_price: string;
    payment_gateway_names: string[];
    note?: string;
    tags?: string;
}

/**
 * ShopifyOrderMapper
 *
 * Handles transformation between Shopify order format and Shipcrowd order format.
 */
export class ShopifyOrderMapper {
    /**
     * Convert Shopify order to Shipcrowd order format
     *
     * @param shopifyOrder - Raw Shopify order data
     * @param store - ShopifyStore document with companyId
     * @returns Shipcrowd-formatted order data
     */
    static toShipcrowd(shopifyOrder: ShopifyOrderData, store: { companyId: any; _id: any }): ShipcrowdOrderData {
        return {
            orderNumber: this.generateOrderNumber(shopifyOrder),
            companyId: store.companyId,
            source: 'shopify',
            sourceId: shopifyOrder.id.toString(),
            externalOrderNumber: shopifyOrder.name,

            customerInfo: {
                name: this.formatCustomerName(shopifyOrder),
                email: shopifyOrder.customer?.email || '',
                phone: this.extractPhone(shopifyOrder),
                address: this.normalizeAddress(shopifyOrder),
            },

            products: this.mapLineItems(shopifyOrder.line_items),

            shippingDetails: {
                shippingCost: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || '0'),
            },

            paymentStatus: this.mapPaymentStatus(shopifyOrder.financial_status),
            paymentMethod: this.detectPaymentMethod(shopifyOrder.payment_gateway_names),
            currentStatus: this.mapFulfillmentStatus(shopifyOrder.fulfillment_status),

            totals: {
                subtotal: parseFloat(shopifyOrder.subtotal_price || shopifyOrder.total_line_items_price),
                tax: parseFloat(shopifyOrder.total_tax || '0'),
                shipping: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || '0'),
                discount: parseFloat(shopifyOrder.total_discounts || '0'),
                total: parseFloat(shopifyOrder.total_price),
            },

            notes: shopifyOrder.note || '',
            tags: shopifyOrder.tags ? shopifyOrder.tags.split(',').map((t) => t.trim()) : [],

            statusHistory: [
                {
                    status: this.mapFulfillmentStatus(shopifyOrder.fulfillment_status),
                    timestamp: new Date(shopifyOrder.created_at),
                    comment: 'Imported from Shopify',
                },
            ],

            createdAt: new Date(shopifyOrder.created_at),
            updatedAt: new Date(shopifyOrder.updated_at),
        };
    }

    /**
     * Generate Shipcrowd order number from Shopify order
     */
    static generateOrderNumber(order: ShopifyOrderData): string {
        return `SHOPIFY-${order.order_number}`;
    }

    /**
     * Format customer name from various sources
     */
    private static formatCustomerName(order: ShopifyOrderData): string {
        // Try customer first
        if (order.customer?.first_name || order.customer?.last_name) {
            return `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim();
        }

        // Try shipping address
        if (order.shipping_address?.first_name || order.shipping_address?.last_name) {
            return `${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`.trim();
        }

        return 'Unknown Customer';
    }

    /**
     * Extract phone number from order
     */
    private static extractPhone(order: ShopifyOrderData): string {
        return (
            order.shipping_address?.phone ||
            order.billing_address?.phone ||
            order.customer?.phone ||
            ''
        );
    }

    /**
     * Normalize address from Shopify format
     */
    private static normalizeAddress(order: ShopifyOrderData): NormalizedAddress {
        const addr = order.shipping_address || order.billing_address;

        return {
            line1: addr?.address1 || '',
            line2: addr?.address2 || '',
            city: addr?.city || '',
            state: addr?.province || '',
            country: addr?.country || 'India',
            postalCode: addr?.zip || '',
        };
    }

    /**
     * Map Shopify line items to Shipcrowd products
     */
    private static mapLineItems(lineItems: ShopifyOrderData['line_items']): NormalizedProduct[] {
        return lineItems.map((item) => ({
            name: item.variant_title ? `${item.title} - ${item.variant_title}` : item.title,
            sku: item.sku || `SHOPIFY-${item.product_id || item.id}`,
            quantity: item.quantity,
            price: parseFloat(item.price),
            weight: item.grams > 0 ? item.grams : undefined,
        }));
    }

    /**
     * Map Shopify financial status to payment status
     */
    static mapPaymentStatus(financialStatus: string): 'pending' | 'paid' | 'failed' | 'refunded' {
        const statusMap: Record<string, 'pending' | 'paid' | 'failed' | 'refunded'> = {
            pending: 'pending',
            authorized: 'pending',
            partially_paid: 'pending',
            paid: 'paid',
            partially_refunded: 'paid',
            refunded: 'refunded',
            voided: 'failed',
            expired: 'failed',
        };

        return statusMap[financialStatus?.toLowerCase()] || 'pending';
    }

    /**
     * Map Shopify fulfillment status to Shipcrowd order status
     */
    static mapFulfillmentStatus(fulfillmentStatus: string | null): string {
        if (!fulfillmentStatus) return 'PENDING';

        const statusMap: Record<string, string> = {
            fulfilled: 'FULFILLED',
            partial: 'PROCESSING',
            unfulfilled: 'PENDING',
            restocked: 'CANCELLED',
        };

        return statusMap[fulfillmentStatus?.toLowerCase()] || 'PENDING';
    }

    /**
     * Detect payment method from gateway names
     */
    static detectPaymentMethod(paymentGateways: string[]): 'cod' | 'prepaid' {
        if (!paymentGateways || paymentGateways.length === 0) {
            return 'prepaid';
        }

        const gateway = paymentGateways[0].toLowerCase();

        // COD detection patterns
        const codPatterns = ['cash', 'cod', 'cash on delivery', 'cash_on_delivery'];
        if (codPatterns.some((pattern) => gateway.includes(pattern))) {
            return 'cod';
        }

        return 'prepaid';
    }
}

// =============================================================================
// WOOCOMMERCE ORDER MAPPER
// =============================================================================

/**
 * WooCommerce order structure (source format)
 */
interface WooCommerceOrderData {
    id: number;
    number: string;
    status: string;
    date_created: string;
    date_modified: string;
    total: string;
    total_tax: string;
    shipping_total: string;
    discount_total: string;
    payment_method: string;
    payment_method_title: string;
    customer_note?: string;
    billing: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        address_1: string;
        address_2: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
    shipping: {
        first_name: string;
        last_name: string;
        address_1: string;
        address_2: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
    line_items: Array<{
        id: number;
        name: string;
        sku: string;
        quantity: number;
        price: number | string;
        product_id: number;
        variation_id: number;
        image?: { src: string };
    }>;
    shipping_lines: Array<{
        method_title: string;
        method_id: string;
        total: string;
    }>;
}

/**
 * WooCommerceOrderMapper
 *
 * Handles transformation between WooCommerce order format and Shipcrowd order format.
 */
export class WooCommerceOrderMapper {
    /**
     * Convert WooCommerce order to Shipcrowd order format
     *
     * @param wooOrder - Raw WooCommerce order data
     * @param store - WooCommerceStore document with companyId
     * @returns Shipcrowd-formatted order data
     */
    static toShipcrowd(wooOrder: WooCommerceOrderData, store: { companyId: any; _id: any }): ShipcrowdOrderData {
        return {
            orderNumber: this.generateOrderNumber(wooOrder),
            companyId: store.companyId,
            source: 'woocommerce',
            sourceId: wooOrder.id.toString(),
            externalOrderNumber: wooOrder.number,

            customerInfo: {
                name: this.formatCustomerName(wooOrder),
                email: wooOrder.billing.email || '',
                phone: wooOrder.billing.phone || '',
                address: this.normalizeAddress(wooOrder),
            },

            products: this.mapLineItems(wooOrder.line_items),

            shippingDetails: {
                shippingCost: parseFloat(wooOrder.shipping_total || '0'),
                provider: wooOrder.shipping_lines[0]?.method_title || 'Standard Shipping',
                shippingMethod: wooOrder.shipping_lines[0]?.method_id || 'flat_rate',
            },

            paymentStatus: this.mapPaymentStatus(wooOrder.status),
            paymentMethod: this.detectPaymentMethod(wooOrder.payment_method),
            currentStatus: this.mapOrderStatus(wooOrder.status),

            totals: {
                subtotal: parseFloat(wooOrder.total) - parseFloat(wooOrder.total_tax),
                tax: parseFloat(wooOrder.total_tax),
                shipping: parseFloat(wooOrder.shipping_total),
                discount: parseFloat(wooOrder.discount_total),
                total: parseFloat(wooOrder.total),
            },

            notes: wooOrder.customer_note || '',
            tags: [],

            statusHistory: [
                {
                    status: this.mapOrderStatus(wooOrder.status),
                    timestamp: new Date(wooOrder.date_created),
                    comment: `Imported from WooCommerce (${wooOrder.status})`,
                },
            ],

            createdAt: new Date(wooOrder.date_created),
            updatedAt: new Date(wooOrder.date_modified),
        };
    }

    /**
     * Generate Shipcrowd order number from WooCommerce order
     */
    static generateOrderNumber(order: WooCommerceOrderData): string {
        return `WOO-${order.number}`;
    }

    /**
     * Format customer name
     */
    private static formatCustomerName(order: WooCommerceOrderData): string {
        // Try shipping address first
        if (order.shipping?.first_name || order.shipping?.last_name) {
            return `${order.shipping.first_name || ''} ${order.shipping.last_name || ''}`.trim();
        }

        // Fallback to billing
        return `${order.billing.first_name || ''} ${order.billing.last_name || ''}`.trim();
    }

    /**
     * Normalize address from WooCommerce format
     */
    private static normalizeAddress(order: WooCommerceOrderData): NormalizedAddress {
        // Prefer shipping address, fallback to billing
        const addr = order.shipping?.address_1 ? order.shipping : order.billing;

        return {
            line1: addr.address_1 || '',
            line2: addr.address_2 || '',
            city: addr.city || '',
            state: addr.state || '',
            country: addr.country || 'IN',
            postalCode: addr.postcode || '',
        };
    }

    /**
     * Map WooCommerce line items to Shipcrowd products
     */
    private static mapLineItems(lineItems: WooCommerceOrderData['line_items']): NormalizedProduct[] {
        return lineItems.map((item) => ({
            name: item.name,
            sku: item.sku || `WOO-${item.product_id}-${item.variation_id || 0}`,
            quantity: item.quantity,
            price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
            imageUrl: item.image?.src || undefined,
        }));
    }

    /**
     * Map WooCommerce order status to payment status
     */
    static mapPaymentStatus(wooStatus: string): 'pending' | 'paid' | 'failed' | 'refunded' {
        const statusMap: Record<string, 'pending' | 'paid' | 'failed' | 'refunded'> = {
            pending: 'pending',
            processing: 'paid',
            'on-hold': 'pending',
            completed: 'paid',
            cancelled: 'failed',
            refunded: 'refunded',
            failed: 'failed',
        };

        return statusMap[wooStatus?.toLowerCase()] || 'pending';
    }

    /**
     * Map WooCommerce order status to Shipcrowd order status
     */
    static mapOrderStatus(wooStatus: string): string {
        const statusMap: Record<string, string> = {
            pending: 'PENDING',
            processing: 'PROCESSING',
            'on-hold': 'PENDING',
            completed: 'DELIVERED',
            cancelled: 'CANCELLED',
            refunded: 'REFUNDED',
            failed: 'CANCELLED',
            trash: 'CANCELLED',
        };

        return statusMap[wooStatus?.toLowerCase()] || 'PENDING';
    }

    /**
     * Detect payment method from WooCommerce payment gateway
     */
    static detectPaymentMethod(paymentMethod: string): 'cod' | 'prepaid' {
        const codGateways = ['cod', 'cash_on_delivery', 'cash'];

        if (codGateways.some((gateway) => paymentMethod?.toLowerCase().includes(gateway))) {
            return 'cod';
        }

        return 'prepaid';
    }
}

// =============================================================================
// FULFILLMENT MAPPER
// =============================================================================

/**
 * FulfillmentMapper
 *
 * Handles transformation of Shipcrowd shipment data to platform-specific fulfillment formats.
 */
export class FulfillmentMapper {
    /**
     * Create Shopify fulfillment payload from Shipcrowd shipment
     *
     * @param shipment - Shipcrowd Shipment document
     * @param order - Shipcrowd Order document
     * @param locationId - Shopify location ID
     * @returns Shopify fulfillment creation payload
     */
    static toShopifyFulfillment(
        shipment: { awbNumber: string; courierName: string; trackingUrl?: string },
        order: { sourceId: string },
        locationId: number
    ): {
        fulfillment: {
            location_id: number;
            tracking_number: string;
            tracking_company: string;
            tracking_url: string;
            notify_customer: boolean;
        };
    } {
        return {
            fulfillment: {
                location_id: locationId,
                tracking_number: shipment.awbNumber,
                tracking_company: shipment.courierName,
                tracking_url: shipment.trackingUrl || this.generateTrackingUrl(shipment.awbNumber, shipment.courierName),
                notify_customer: true,
            },
        };
    }

    /**
     * Create WooCommerce order update payload for fulfillment
     *
     * @param shipment - Shipcrowd Shipment document
     * @param newStatus - Target WooCommerce status
     * @returns WooCommerce order update payload
     */
    static toWooCommerceUpdate(
        shipment: { awbNumber: string; courierName: string; trackingUrl?: string },
        newStatus: 'processing' | 'completed' | 'cancelled'
    ): {
        status: string;
        meta_data: Array<{ key: string; value: string }>;
    } {
        return {
            status: newStatus,
            meta_data: [
                { key: '_tracking_number', value: shipment.awbNumber },
                { key: '_tracking_provider', value: shipment.courierName },
                {
                    key: '_tracking_url',
                    value: shipment.trackingUrl || this.generateTrackingUrl(shipment.awbNumber, shipment.courierName),
                },
            ],
        };
    }

    /**
     * Map Shipcrowd shipment status to Shopify fulfillment status
     */
    static toShopifyStatus(ShipcrowdStatus: string): string {
        const statusMap: Record<string, string> = {
            PICKED_UP: 'in_transit',
            IN_TRANSIT: 'in_transit',
            OUT_FOR_DELIVERY: 'out_for_delivery',
            DELIVERED: 'delivered',
            ATTEMPTED_DELIVERY: 'attempted_delivery',
            FAILED_ATTEMPT: 'failure',
            RTO_INITIATED: 'failure',
            RTO_IN_TRANSIT: 'failure',
            RTO_DELIVERED: 'failure',
        };

        return statusMap[ShipcrowdStatus] || 'in_transit';
    }

    /**
     * Map Shipcrowd shipment status to WooCommerce order status
     */
    static toWooCommerceStatus(ShipcrowdStatus: string): 'processing' | 'completed' | 'cancelled' | 'failed' {
        const statusMap: Record<string, 'processing' | 'completed' | 'cancelled' | 'failed'> = {
            PENDING: 'processing',
            BOOKED: 'processing',
            PICKED_UP: 'processing',
            IN_TRANSIT: 'processing',
            OUT_FOR_DELIVERY: 'processing',
            DELIVERED: 'completed',
            CANCELLED: 'cancelled',
            RTO_DELIVERED: 'failed',
        };

        return statusMap[ShipcrowdStatus] || 'processing';
    }

    /**
     * Generate tracking URL for courier
     */
    private static generateTrackingUrl(awbNumber: string, courierName: string): string {
        const courier = courierName.toLowerCase();

        const trackingUrls: Record<string, string> = {
            bluedart: `https://www.bluedart.com/tracking?tracking_id=${awbNumber}`,
            delhivery: `https://www.delhivery.com/track/package/${awbNumber}`,
            ecom: `https://ecomexpress.in/tracking/?awb_field=${awbNumber}`,
            xpressbees: `https://www.xpressbees.com/shipment/tracking?awb=${awbNumber}`,
            dtdc: `https://www.dtdc.in/tracking/shipment-tracking.asp?strCnno=${awbNumber}`,
            ekart: `https://ekartlogistics.com/track/${awbNumber}`,
            shadowfax: `https://tracker.shadowfax.in/#/track?awb=${awbNumber}`,
            shiprocket: `https://shiprocket.co/tracking/${awbNumber}`,
            nimbuspost: `https://www.nimbuspost.com/tracking?search_by=awb&waybill_id=${awbNumber}`,
        };

        for (const [key, url] of Object.entries(trackingUrls)) {
            if (courier.includes(key)) {
                return url;
            }
        }

        return `${process.env.FRONTEND_URL || 'https://Shipcrowd.com'}/track/${awbNumber}`;
    }
}

// Export all mappers
export default {
    ShopifyOrderMapper,
    WooCommerceOrderMapper,
    FulfillmentMapper,
};
