/**
 * MobileOrderCard - Psychology-driven mobile order card
 *
 * Research-backed UX decisions:
 * 1. Status-first hierarchy (urgent orders catch eye immediately)
 * 2. Swipe gestures for primary actions (thumb-zone optimization)
 * 3. Color-coded priority (pre-attentive processing)
 * 4. Contextual actions based on status (reduce decision fatigue)
 * 5. Progressive disclosure (expandable details)
 *
 * Touch targets: 44x44px minimum (Apple HIG)
 * Swipe threshold: 80px (comfortable for one-handed use)
 *
 * Priority Hierarchy:
 * - URGENT: Pickup pending (time-sensitive), Delivery exceptions
 * - NORMAL: In transit, Out for delivery
 * - COMPLETED: Delivered, RTO
 */

'use client';

import { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import {
  Package,
  Phone,
  MapPin,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Copy,
  Eye
} from 'lucide-react';
import { SourceBadge } from '@/src/components/ui/data/SourceBadge';
import { cn, formatCurrency } from '@/src/lib/utils';
import { trackEvent, EVENTS } from '@/src/lib/analytics';

// Order status type
export type OrderStatus =
  | 'pending'
  | 'ready_to_ship'
  | 'shipped'
  | 'created'
  | 'pickup_pending'
  | 'pickup_failed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'rto_initiated'
  | 'rto_delivered'
  | 'cancelled';

export type PaymentMode = 'COD' | 'PREPAID';

export interface MobileOrderCardData {
  id: string;
  awbNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  destination: string; // City, State
  pincode: string;
  paymentMode: PaymentMode;
  amount: number;
  amountCurrency?: string;
  originalAmountLabel?: string;
  createdAt: string; // ISO string
  courierName?: string;
  urgentReason?: string; // e.g., "Pickup in 2 hours", "Exception: Address incomplete"
  source?: string;
}

interface MobileOrderCardProps {
  order: MobileOrderCardData;
  onTrack?: (order: MobileOrderCardData) => void;
  onCall?: (order: MobileOrderCardData) => void;
  onShip?: () => void;
  onClick?: (order: MobileOrderCardData) => void;
  className?: string;
}

// Status configuration with priority
const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    icon: typeof Package;
    color: string;
    bgColor: string;
    borderColor: string;
    priority: 'urgent' | 'normal' | 'completed';
  }
> = {
  pickup_pending: {
    label: 'Pickup Pending',
    icon: Clock,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    priority: 'urgent'
  },
  pickup_failed: {
    label: 'Pickup Failed',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
    priority: 'urgent'
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    priority: 'normal'
  },
  ready_to_ship: {
    label: 'Ready to Ship',
    icon: Package,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    priority: 'normal'
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    priority: 'normal'
  },
  created: {
    label: 'Created',
    icon: Package,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    priority: 'normal'
  },
  in_transit: {
    label: 'In Transit',
    icon: Truck,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    priority: 'normal'
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    icon: Truck,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    priority: 'normal'
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
    priority: 'completed'
  },
  rto_initiated: {
    label: 'RTO Initiated',
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    priority: 'urgent'
  },
  rto_delivered: {
    label: 'RTO Delivered',
    icon: XCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    priority: 'completed'
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    priority: 'completed'
  }
};

// Format time ago
function timeAgo(isoString: string): string {
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Copy to clipboard helper
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mobile Order Card with Swipe Actions
 */
export function MobileOrderCard({
  order,
  onTrack,
  onCall,
  onShip,
  onClick,
  className
}: MobileOrderCardProps) {
  const config = statusConfig[order.status] || statusConfig.created;
  const Icon = config.icon;
  const [isCopied, setIsCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Swipe gesture state
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-80, 0, 80], [0.5, 1, 0.5]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Swipe left to track (>80px)
    if (info.offset.x < -80 && onTrack) {
      onTrack(order);
      trackEvent(EVENTS.TREND_CLICKED, {
        metric: 'order_swipe_track',
        range: '7d'
      });
      x.set(0); // Reset position
    }
    // Swipe right to call (>80px)
    else if (info.offset.x > 80 && onCall) {
      onCall(order);
      trackEvent(EVENTS.TREND_CLICKED, {
        metric: 'order_swipe_call',
        range: '7d'
      });
      x.set(0); // Reset position
    }
    // Not enough swipe, snap back
    else {
      x.set(0);
    }
  };

  const handleCopyAWB = async () => {
    const success = await copyToClipboard(order.awbNumber);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Swipe action hints (background) */}
      <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
        {/* Right swipe hint (Call) */}
        <motion.div
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400"
          style={{ opacity: useTransform(x, [0, 80], [0, 1]) }}
        >
          <Phone className="w-5 h-5" />
          <span className="text-sm font-medium">Call</span>
        </motion.div>

        {/* Left swipe hint (Track) */}
        <motion.div
          className="flex items-center gap-2 text-purple-600 dark:text-purple-400"
          style={{ opacity: useTransform(x, [-80, 0], [1, 0]) }}
        >
          <span className="text-sm font-medium">Track</span>
          <Eye className="w-5 h-5" />
        </motion.div>
      </div>

      {/* Card (swipeable) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x, opacity }}
        className={cn(
          'relative bg-[var(--bg-primary)] rounded-2xl border-2 p-4',
          'shadow-sm active:shadow-md transition-shadow',
          config.borderColor,
          // Urgent orders: pulsing border
          config.priority === 'urgent' && 'animate-pulse-border'
        )}
        onClick={() => onClick?.(order)}
      >
        {/* Urgent badge */}
        {config.priority === 'urgent' && order.urgentReason && (
          <div className="absolute -top-2 left-4 px-2 py-0.5 bg-red-600 dark:bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{order.urgentReason}</span>
          </div>
        )}

        {/* Header: Status + Payment Mode + Source */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg', config.bgColor)}>
              <Icon className={cn('w-4 h-4', config.color)} />
              <span className={cn('text-xs font-bold', config.color)}>{config.label}</span>
            </div>
            {order.source && <SourceBadge source={order.source} size="sm" />}
          </div>

          <div className="flex items-center gap-2">
            {/* Payment mode badge */}
            <span
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider',
                order.paymentMode === 'COD'
                  ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800'
                  : 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800'
              )}
            >
              {order.paymentMode}
            </span>

            {/* Time ago */}
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
              {timeAgo(order.createdAt)}
            </span>
          </div>
        </div>

        {/* AWB Number (copyable) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyAWB();
          }}
          className="flex items-center gap-2 mb-3 w-fit group"
        >
          <span className="font-mono text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">
            {order.awbNumber}
          </span>
          {isCopied ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--primary-blue)] transition-colors" />
          )}
        </button>

        {/* Customer Info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {order.customerName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
            <span className="text-xs text-[var(--text-secondary)] truncate">
              {order.destination} - {order.pincode}
            </span>
          </div>
        </div>

        {/* Footer: Amount + Courier + Action */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
          <div>
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {formatCurrency(order.amount, order.amountCurrency || 'INR')}
            </div>
            {order.originalAmountLabel && (
              <div className="text-[10px] text-[var(--text-muted)]">
                {order.originalAmountLabel}
              </div>
            )}
            {order.courierName && (
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
                via {order.courierName}
              </div>
            )}
          </div>

          {/* When shippable: Ship Now as primary CTA. When shipped: Actions with Track, Call */}
          {onShip ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShip();
              }}
              className="flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-lg bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white text-sm font-medium transition-colors"
              aria-label={`Ship order ${order.awbNumber}`}
            >
              <Truck className="w-4 h-4" />
              <span>Ship Now</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-lg bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white text-xs font-medium transition-colors"
            >
              <span>Actions</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Expandable actions panel (Track, Call) - only when shipped, not shippable */}
      {!onShip && showActions && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] overflow-hidden"
        >
          <div className="grid grid-cols-2 gap-2 p-3">
            {onTrack && (
              <button
                onClick={() => {
                  onTrack(order);
                  setShowActions(false);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-primary)] transition-colors"
                aria-label="Track shipment"
              >
                <Eye className="w-4 h-4" />
                <span>Track</span>
              </button>
            )}
            {onCall && (
              <button
                onClick={() => {
                  onCall(order);
                  setShowActions(false);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-primary)] transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Call</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
