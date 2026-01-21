/**
 * Order Priority System
 *
 * Psychology: Attention management - urgent items should always be visible first
 *
 * Priority Levels:
 * 1. CRITICAL - Immediate action required (pickup pending < 2h, delivery exceptions)
 * 2. HIGH - Time-sensitive (pickup pending, RTO initiated)
 * 3. MEDIUM - Active monitoring (in transit, out for delivery)
 * 4. LOW - Completed/archived (delivered, cancelled, RTO delivered)
 */

import { Order } from '@/src/types/domain/order';
import { OrderStatus } from '@/src/components/seller/orders/MobileOrderCard';

export type OrderPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Status to priority mapping
 */
const STATUS_PRIORITY_MAP: Record<string, OrderPriority> = {
  // Critical - Immediate action
  pickup_pending: 'critical', // Needs scheduling
  pickup_failed: 'critical',  // Needs rescheduling

  // High - Time-sensitive
  rto_initiated: 'high',      // Revenue at risk
  exception: 'high',          // Delivery issue

  // Medium - Active
  in_transit: 'medium',
  out_for_delivery: 'medium',
  shipped: 'medium',
  processing: 'medium',

  // Low - Completed
  delivered: 'low',
  cancelled: 'low',
  rto_delivered: 'low',
  pending: 'low'
};

/**
 * Get order priority based on status and other factors
 */
export function getOrderPriority(order: Order): OrderPriority {
  const statusPriority = STATUS_PRIORITY_MAP[order.currentStatus] || 'medium';

  // Upgrade to critical if pickup pending and created > 2 hours ago
  if (order.currentStatus === 'pickup_pending') {
    const createdAt = new Date(order.createdAt);
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 2) {
      return 'critical';
    }
  }

  // Upgrade to high if COD and value > 5000
  if (order.paymentMethod === 'cod' && (order.totals?.total || 0) > 5000) {
    if (statusPriority === 'medium') {
      return 'high';
    }
  }

  return statusPriority;
}

/**
 * Get urgent reason for display (why this order needs attention)
 */
export function getUrgentReason(order: Order): string | undefined {
  const priority = getOrderPriority(order);

  if (priority === 'critical') {
    if (order.currentStatus === 'pickup_pending') {
      const createdAt = new Date(order.createdAt);
      const hoursSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
      return `Pickup pending ${hoursSinceCreation}h`;
    }
    if (order.currentStatus === 'pickup_failed') {
      return 'Pickup failed - Reschedule';
    }
  }

  if (priority === 'high') {
    if (order.currentStatus === 'rto_initiated') {
      return 'RTO in progress';
    }
  }

  return undefined;
}

/**
 * Sort orders by priority (critical first, then high, medium, low)
 * Within same priority, sort by creation date (newest first)
 */
export function sortOrdersByPriority(orders: Order[]): Order[] {
  const priorityWeight: Record<OrderPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  return [...orders].sort((a, b) => {
    const aPriority = getOrderPriority(a);
    const bPriority = getOrderPriority(b);

    // First, sort by priority
    const priorityDiff = priorityWeight[bPriority] - priorityWeight[aPriority];
    if (priorityDiff !== 0) return priorityDiff;

    // If same priority, sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Convert Order to MobileOrderCardData
 */
export function orderToCardData(order: Order) {
  return {
    id: order._id,
    awbNumber: order.shippingDetails?.trackingNumber || order.orderNumber,
    status: order.currentStatus as OrderStatus,
    customerName: order.customerInfo.name,
    customerPhone: order.customerInfo.phone,
    destination: `${order.customerInfo.address.city}, ${order.customerInfo.address.state}`,
    pincode: order.customerInfo.address.postalCode,
    paymentMode: (order.paymentMethod?.toUpperCase() || 'PREPAID') as 'COD' | 'PREPAID',
    amount: order.totals?.total || 0,
    createdAt: order.createdAt,
    courierName: order.shippingDetails?.provider,
    urgentReason: getUrgentReason(order)
  };
}
