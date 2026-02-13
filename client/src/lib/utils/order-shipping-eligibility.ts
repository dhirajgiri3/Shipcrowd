import type { Order } from '@/src/types/domain/order';

const SHIPPABLE_ORDER_STATUSES = new Set(['pending', 'ready_to_ship']);

export const isSellerOrderShippable = (order: Order): boolean => {
  return SHIPPABLE_ORDER_STATUSES.has(String(order.currentStatus || '').toLowerCase());
};

export const getShipDisabledReason = (order: Order): string | null => {
  if (isSellerOrderShippable(order)) {
    return null;
  }

  const status = String(order.currentStatus || 'unknown');
  return `Only pending or ready_to_ship orders can be shipped. Current status: ${status}.`;
};

