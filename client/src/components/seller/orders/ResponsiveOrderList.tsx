/**
 * ResponsiveOrderList - Adaptive order list component
 *
 * Psychology: Device-appropriate interfaces (mobile cards, desktop table)
 * UX: Seamless experience across devices with consistent functionality
 *
 * Mobile (< 1024px): Card-based list with swipe actions
 * Desktop (>= 1024px): Table view with inline actions
 *
 * Features:
 * - Priority-based sorting (urgent orders first)
 * - Responsive layout switching
 * - Consistent actions across devices
 * - Loading and empty states
 */

'use client';

import { useState } from 'react';
import { Order } from '@/src/types/domain/order';
import { MobileOrderCard, MobileOrderCardData } from './MobileOrderCard';
import { orderToCardData, sortOrdersByPriority } from '@/src/lib/utils/orderPriority';
import { useIsMobile } from '@/src/hooks/ux';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { Package, Phone, Eye, Calendar, User, ShoppingBag, CreditCard, TrendingUp, ArrowUpRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { trackEvent, EVENTS } from '@/src/lib/analytics';

interface ResponsiveOrderListProps {
  orders: Order[];
  isLoading?: boolean;
  onOrderClick?: (order: Order) => void;
  className?: string;
}

/**
 * Desktop table column configuration
 */
const getDesktopColumns = (onOrderClick?: (order: Order) => void) => [
  {
    header: 'Order ID',
    accessorKey: 'orderNumber',
    cell: (row: Order) => (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[var(--text-primary)] text-sm font-mono">
          {row.orderNumber}
        </span>
      </div>
    )
  },
  {
    header: 'Date',
    accessorKey: 'createdAt',
    cell: (row: Order) => (
      <div className="flex flex-col text-xs">
        <span className="text-[var(--text-primary)] font-medium">
          {new Date(row.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
          })}
        </span>
        <span className="text-[var(--text-muted)]">
          {new Date(row.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    )
  },
  {
    header: 'Customer',
    accessorKey: 'customerInfo',
    cell: (row: Order) => (
      <div className="max-w-[180px]">
        <div className="font-medium text-[var(--text-primary)] text-sm truncate">
          {row.customerInfo.name}
        </div>
        <div className="text-xs text-[var(--text-muted)] opacity-80 truncate">
          {row.customerInfo.phone}
        </div>
      </div>
    )
  },
  {
    header: 'Product',
    accessorKey: 'products',
    cell: (row: Order) => {
      const firstProduct = row.products[0];
      const totalQty = row.products.reduce((sum, p) => sum + p.quantity, 0);
      return (
        <div className="max-w-[200px] flex items-center gap-2">
          <div className="flex-1 truncate">
            <div
              className="font-medium text-[var(--text-primary)] text-sm truncate"
              title={firstProduct?.name}
            >
              {firstProduct?.name || 'No product'}
            </div>
          </div>
          {row.products.length > 1 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              +{row.products.length - 1}
            </span>
          )}
          {totalQty > 1 && row.products.length === 1 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              x{totalQty}
            </span>
          )}
        </div>
      );
    }
  },
  {
    header: 'Payment',
    accessorKey: 'paymentStatus',
    cell: (row: Order) => (
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide w-fit',
            row.paymentStatus === 'paid'
              ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800'
              : row.paymentStatus === 'pending'
              ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800'
              : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800'
          )}
        >
          {row.paymentStatus}
        </span>
        {row.paymentMethod && (
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md w-fit',
              row.paymentMethod === 'cod'
                ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400'
                : 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
            )}
          >
            {row.paymentMethod}
          </span>
        )}
      </div>
    )
  },
  {
    header: 'Status',
    accessorKey: 'currentStatus',
    cell: (row: Order) => (
      <span
        className={cn(
          'inline-flex px-2.5 py-1 rounded-md text-xs font-semibold capitalize',
          row.currentStatus === 'delivered'
            ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
            : row.currentStatus === 'in_transit'
            ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
            : row.currentStatus === 'pickup_pending'
            ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
            : 'bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400'
        )}
      >
        {row.currentStatus.replace(/_/g, ' ')}
      </span>
    )
  },
  {
    header: 'Total',
    accessorKey: 'totals.total',
    cell: (row: Order) => (
      <div className="text-right font-bold text-[var(--text-primary)]">
        ₹{row.totals?.total.toLocaleString('en-IN') || 0}
      </div>
    )
  },
  {
    header: 'Actions',
    accessorKey: 'actions',
    cell: (row: Order) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOrderClick?.(row);
        }}
        className="text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] font-medium text-sm flex items-center gap-1 transition-colors"
      >
        View
        <ArrowUpRight className="w-4 h-4" />
      </button>
    )
  }
];

export function ResponsiveOrderList({
  orders,
  isLoading = false,
  onOrderClick,
  className
}: ResponsiveOrderListProps) {
  const isMobile = useIsMobile();

  // Sort orders by priority (urgent first)
  const sortedOrders = sortOrdersByPriority(orders);

  // Handle tracking action
  const handleTrack = (orderData: MobileOrderCardData) => {
    trackEvent(EVENTS.TREND_CLICKED, {
      metric: 'order_track',
      range: '7d'
    });
    // TODO: Implement tracking logic
    console.log('Track order:', orderData.id);
  };

  // Handle call action
  const handleCall = (orderData: MobileOrderCardData) => {
    trackEvent(EVENTS.TREND_CLICKED, {
      metric: 'order_call_customer',
      range: '7d'
    });
    // Open phone dialer
    window.location.href = `tel:${orderData.customerPhone}`;
  };

  // Handle card click
  const handleCardClick = (orderData: MobileOrderCardData) => {
    const order = sortedOrders.find((o) => o._id === orderData.id);
    if (order && onOrderClick) {
      onOrderClick(order);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-32 bg-[var(--bg-secondary)] rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (sortedOrders.length === 0) {
    return (
      <div className={cn('py-24 text-center', className)}>
        <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          No orders found
        </h3>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Your orders will appear here once created
        </p>
      </div>
    );
  }

  // Mobile: Card-based list
  if (isMobile) {
    return (
      <div className={cn('space-y-4', className)}>
        {sortedOrders.map((order) => {
          const cardData = orderToCardData(order);
          return (
            <MobileOrderCard
              key={order._id}
              order={cardData}
              onTrack={handleTrack}
              onCall={handleCall}
              onClick={handleCardClick}
            />
          );
        })}
      </div>
    );
  }

  // Desktop: Table view
  return (
    <div className={className}>
      <DataTable
        columns={getDesktopColumns(onOrderClick)}
        data={sortedOrders}
        onRowClick={onOrderClick}
        isLoading={isLoading}
      />
    </div>
  );
}
