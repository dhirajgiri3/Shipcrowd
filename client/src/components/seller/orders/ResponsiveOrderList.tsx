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
import { Package, Phone, Calendar, User, ShoppingBag, CreditCard, TrendingUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { trackEvent, EVENTS } from '@/src/lib/analytics';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { formatCurrency, formatDateTime } from '@/src/lib/utils/common';

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
          {formatDateTime(row.createdAt).split(',')[0]}
        </span>
        <span className="text-[var(--text-muted)]">
          {formatDateTime(row.createdAt).split(',')[1]}
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
        <div className="flex flex-col gap-1">
          <StatusBadge
            status={row.paymentStatus}
            size="sm"
            className="w-fit"
          />
          {row.paymentMethod && (
            <StatusBadge
              status={row.paymentMethod}
              size="sm"
              className="w-fit opacity-90"
            />
          )}
        </div>
      </div>
    )
  },
  {
    header: 'Status',
    accessorKey: 'currentStatus',
    cell: (row: Order) => (
      <StatusBadge domain="order" status={row.currentStatus} />
    )
  },
  {
    header: 'Total',
    accessorKey: 'totals.total',
    cell: (row: Order) => (
      <div className="text-right font-bold text-[var(--text-primary)]">
        {formatCurrency(row.totals?.total || 0)}
      </div>
    )
  },
  {
    header: 'Actions',
    accessorKey: 'actions',
    cell: (row: Order) => (
      <ViewActionButton
        label="View"
        onClick={(e) => {
          e.stopPropagation();
          onOrderClick?.(row);
        }}
      />
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
