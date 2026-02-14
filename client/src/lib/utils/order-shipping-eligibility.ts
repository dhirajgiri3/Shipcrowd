import type { Order } from '@/src/types/domain/order';

const SHIPPABLE_ORDER_STATUSES = new Set(['pending', 'ready_to_ship']);

export const isSellerOrderShippable = (order: Order): boolean => {
  return SHIPPABLE_ORDER_STATUSES.has(String(order.currentStatus || '').toLowerCase());
};

export const getShipDisabledReason = (order: Order): string | null => {
  if (isSellerOrderShippable(order)) {
    return null;
  }

  const status = String(order.currentStatus || '').toLowerCase();
  if (['shipped', 'delivered', 'in_transit', 'out_for_delivery'].includes(status)) {
    return 'This order is already shipped';
  }
  if (['rto', 'rto_initiated', 'rto_delivered'].includes(status)) {
    return 'This order is in return. Track it from Shipments.';
  }
  if (['cancelled'].includes(status)) {
    return 'This order is cancelled';
  }
  return 'This order cannot be shipped in its current state';
};

