'use client';

import { useContext } from 'react';
import { OrderContext } from '../context/OrderContext';
import type { OrderContextType } from '@/src/types/order';

/**
 * useOrders Hook
 * Access order state and methods
 *
 * Usage:
 * const { orders, createOrder, getOrders, isLoading } = useOrders();
 *
 * Throws error if used outside OrderProvider
 */
export function useOrders(): OrderContextType {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }

  return context;
}

export default useOrders;
