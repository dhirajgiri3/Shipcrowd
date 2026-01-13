/**
 * Optimistic Updates Module
 *
 * Provides utilities for implementing optimistic updates in React Query mutations.
 * Optimistic updates improve perceived performance by updating the UI immediately
 * before the server response is received, then rolling back on error.
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Optimistic Update Context
 */
export interface OptimisticUpdateContext {
  previousData: any;
  queryKey: any[];
  timestamp: number;
}

/**
 * Update function type
 */
export type UpdateFn<T> = (oldData: T) => T;

/**
 * Helper to create optimistic update for list items
 */
export const optimisticListUpdate = <T extends { id?: string; _id?: string }>(
  oldData: T[] | any,
  newItem: T,
  options?: {
    position?: 'start' | 'end';
    updateExisting?: boolean;
  }
) => {
  const { position = 'start', updateExisting = true } = options || {};

  if (oldData && typeof oldData === 'object' && 'data' in oldData && Array.isArray(oldData.data)) {
    const items = oldData.data as T[];
    const itemId = newItem.id || (newItem as any)._id;
    const existingIndex = items.findIndex((item) => (item.id || (item as any)._id) === itemId);

    if (existingIndex !== -1 && updateExisting) {
      items[existingIndex] = newItem;
    } else if (existingIndex === -1) {
      if (position === 'end') {
        items.push(newItem);
      } else {
        items.unshift(newItem);
      }
    }

    return { ...oldData, data: items };
  }

  if (Array.isArray(oldData)) {
    const items = [...oldData];
    const itemId = newItem.id || (newItem as any)._id;
    const existingIndex = items.findIndex((item) => (item.id || (item as any)._id) === itemId);

    if (existingIndex !== -1 && updateExisting) {
      items[existingIndex] = newItem;
    } else if (existingIndex === -1) {
      if (position === 'end') {
        items.push(newItem);
      } else {
        items.unshift(newItem);
      }
    }

    return items;
  }

  return oldData;
};

/**
 * Helper to create optimistic update for single item
 */
export const optimisticItemUpdate = <T>(oldData: T, newData: Partial<T>) => {
  if (oldData && typeof oldData === 'object' && 'data' in oldData) {
    return {
      ...oldData,
      data: {
        ...(oldData as any).data,
        ...newData,
      },
    };
  }

  return {
    ...oldData,
    ...newData,
  };
};

/**
 * Helper to remove item from list
 */
export const optimisticListRemove = <T extends { id?: string; _id?: string }>(
  oldData: T[] | any,
  itemId: string
) => {
  if (oldData && typeof oldData === 'object' && 'data' in oldData && Array.isArray(oldData.data)) {
    const items = oldData.data as T[];
    return {
      ...oldData,
      data: items.filter((item) => (item.id || (item as any)._id) !== itemId),
    };
  }

  if (Array.isArray(oldData)) {
    return oldData.filter((item) => (item.id || (item as any)._id) !== itemId);
  }

  return oldData;
};

/**
 * Create optimistic update handler for mutations
 */
export const createOptimisticUpdateHandler = <T, TVariables>({
  queryClient,
  queryKey,
  updateFn,
  onMutateCallback,
  onErrorCallback,
}: {
  queryClient: QueryClient;
  queryKey: any[];
  updateFn: (oldData: T) => T;
  onMutateCallback?: (context: OptimisticUpdateContext) => void;
  onErrorCallback?: (context: OptimisticUpdateContext) => void;
}) => ({
  onMutate: async (variables: TVariables) => {
    await queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (oldData: T) => updateFn(oldData));

    const context: OptimisticUpdateContext = {
      previousData,
      queryKey,
      timestamp: Date.now(),
    };

    onMutateCallback?.(context);
    return context;
  },

  onError: (_: any, __: TVariables, context?: OptimisticUpdateContext) => {
    if (context?.previousData !== undefined) {
      queryClient.setQueryData(queryKey, context.previousData);
    }
    onErrorCallback?.(context!);
  },
});

/**
 * Create optimistic update handler for list mutations
 */
export const createOptimisticListUpdateHandler = <T extends { id?: string; _id?: string }, TVariables>({
  queryClient,
  queryKey,
  updateType,
  itemExtractor,
  onMutateCallback,
}: {
  queryClient: QueryClient;
  queryKey: any[];
  updateType: 'add' | 'update' | 'remove';
  itemExtractor: (variables: TVariables) => T | string;
  onMutateCallback?: (context: OptimisticUpdateContext) => void;
}) => ({
  onMutate: async (variables: TVariables) => {
    await queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (updateType === 'add') {
        return optimisticListUpdate(oldData, itemExtractor(variables) as T, { position: 'start' });
      } else if (updateType === 'update') {
        return optimisticListUpdate(oldData, itemExtractor(variables) as T, { updateExisting: true });
      } else if (updateType === 'remove') {
        const itemId = typeof itemExtractor(variables) === 'string'
          ? (itemExtractor(variables) as string)
          : ((itemExtractor(variables) as T).id || (itemExtractor(variables) as any)._id);
        return optimisticListRemove(oldData, itemId);
      }
      return oldData;
    });

    const context: OptimisticUpdateContext = {
      previousData,
      queryKey,
      timestamp: Date.now(),
    };

    onMutateCallback?.(context);
    return context;
  },

  onError: (_: any, __: TVariables, context?: OptimisticUpdateContext) => {
    if (context?.previousData !== undefined) {
      queryClient.setQueryData(queryKey, context.previousData);
    }
  },
});

/**
 * Analytics for optimistic updates
 */
export class OptimisticUpdateAnalytics {
  private totalUpdates = 0;
  private successfulUpdates = 0;
  private failedUpdates = 0;
  private rollbacks = 0;

  recordUpdate(success: boolean): void {
    this.totalUpdates++;
    if (success) {
      this.successfulUpdates++;
    } else {
      this.failedUpdates++;
    }
  }

  recordRollback(): void {
    this.rollbacks++;
  }

  getMetrics() {
    return {
      totalUpdates: this.totalUpdates,
      successfulUpdates: this.successfulUpdates,
      failedUpdates: this.failedUpdates,
      rollbacks: this.rollbacks,
      successRate: this.totalUpdates > 0
        ? ((this.successfulUpdates / this.totalUpdates) * 100).toFixed(2) + '%'
        : '0%',
      rollbackRate: this.totalUpdates > 0
        ? ((this.rollbacks / this.totalUpdates) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  reset(): void {
    this.totalUpdates = 0;
    this.successfulUpdates = 0;
    this.failedUpdates = 0;
    this.rollbacks = 0;
  }
}

export const optimisticUpdateAnalytics = new OptimisticUpdateAnalytics();

export default {
  optimisticListUpdate,
  optimisticItemUpdate,
  optimisticListRemove,
  createOptimisticUpdateHandler,
  createOptimisticListUpdateHandler,
  optimisticUpdateAnalytics,
};
