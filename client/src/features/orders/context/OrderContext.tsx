'use client';

import React, { createContext, useCallback, useState } from 'react';
import type { Order, CreateOrderRequest, OrderListParams, OrderContextType } from '@/src/types/order';
import { orderApi } from '@/src/core/api/order.api';
import { normalizeError } from '@/src/core/api/client';

/**
 * Order Context
 * Manages order state and provides order methods
 */
export const OrderContext = createContext<OrderContextType | null>(null);

interface OrderProviderProps {
  children: React.ReactNode;
}

/**
 * Order Provider Component
 * Handles:
 * - Order list state management
 * - Current order state
 * - Order CRUD operations
 * - Error handling
 */
export function OrderProvider({ children }: OrderProviderProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new order
   */
  const createOrder = useCallback(
    async (data: CreateOrderRequest) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await orderApi.createOrder(data);
        const newOrder = response.data.order;

        // Optimistic update: add to local state
        setOrders((prev) => [newOrder, ...prev]);

        return { success: true, order: newOrder };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr.message);
        return { success: false, error: normalizedErr.message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get list of orders
   */
  const getOrders = useCallback(
    async (params?: OrderListParams) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await orderApi.getOrders(params);
        setOrders(response.data.orders);
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get single order by ID
   */
  const getOrder = useCallback(
    async (orderId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await orderApi.getOrder(orderId);
        setCurrentOrder(response.data.order);
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update an order
   */
  const updateOrder = useCallback(
    async (orderId: string, data: Partial<CreateOrderRequest>) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await orderApi.updateOrder(orderId, data);
        const updatedOrder = response.data.order;

        // Update in list
        setOrders((prev) =>
          prev.map((order) => (order._id === orderId ? updatedOrder : order))
        );

        // Update current if it's the same order
        if (currentOrder?._id === orderId) {
          setCurrentOrder(updatedOrder);
        }

        return { success: true, order: updatedOrder };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr.message);
        return { success: false, error: normalizedErr.message };
      } finally {
        setIsLoading(false);
      }
    },
    [currentOrder?._id]
  );

  /**
   * Delete an order
   */
  const deleteOrder = useCallback(
    async (orderId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        await orderApi.deleteOrder(orderId);

        // Remove from list
        setOrders((prev) => prev.filter((order) => order._id !== orderId));

        // Clear current if it's the same order
        if (currentOrder?._id === orderId) {
          setCurrentOrder(null);
        }

        return { success: true };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr.message);
        return { success: false, error: normalizedErr.message };
      } finally {
        setIsLoading(false);
      }
    },
    [currentOrder?._id]
  );

  /**
   * Clear error manually
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: OrderContextType = {
    orders,
    currentOrder,
    isLoading,
    error,
    createOrder,
    getOrders,
    getOrder,
    updateOrder,
    deleteOrder,
    clearError,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

export default OrderProvider;
