/**
 * Centralized Status Configuration System
 *
 * Single source of truth for all status labels, colors, and display configurations.
 * Removes duplication from ReturnsTable, NDRCasesTable, ManifestTable, etc.
 *
 * Usage:
 * ```typescript
 * import { STATUS_CONFIGS, getStatusConfig } from '@/src/config/status.config';
 *
 * // Get full config
 * const config = getStatusConfig('return', 'approved');
 *
 * // Or access directly
 * const color = STATUS_CONFIGS.return.approved.color;
 * ```
 */

import type { ReturnStatus } from '@/src/types/api/returns';
import type { NDRStatus } from '@/src/types/api/orders';
import type { ManifestStatus } from '@/src/types/api/orders';
import type { DisputeStatus } from '@/src/types/api/returns';
import type { RemittanceStatus, PayoutStatus } from '@/src/types/api/finance';
import type { WebhookStatus } from '@/src/types/api/settings';


/**
 * Color scheme for status badges
 * Uses Tailwind color classes for consistency with theme
 */
export const STATUS_COLORS = {
  success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 ring-1 ring-inset ring-yellow-600/20',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/10',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10',
  pending: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 ring-1 ring-inset ring-orange-600/20',
  neutral: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 ring-1 ring-inset ring-gray-500/10',
  primary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-700/10',
  secondary: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 ring-1 ring-inset ring-purple-700/10',
  tertiary: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 ring-1 ring-inset ring-cyan-700/10',
  alert: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 ring-1 ring-inset ring-teal-700/10',
} as const;

/**
 * Status configuration type
 */
export interface StatusConfig {
  label: string;
  color: keyof typeof STATUS_COLORS;
  description?: string;
  icon?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// WAREHOUSE STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const WAREHOUSE_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    label: 'Active',
    color: 'success',
    description: 'Warehouse operational',
  },
  inactive: {
    label: 'Inactive',
    color: 'warning',
    description: 'Warehouse inactive',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// RETURN STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const RETURN_STATUS_CONFIG: Record<ReturnStatus, StatusConfig> = {
  requested: {
    label: 'Requested',
    color: 'warning',
    description: 'Return requested by customer',
  },
  approved: {
    label: 'Approved',
    color: 'info',
    description: 'Approved by seller',
  },
  rejected: {
    label: 'Rejected',
    color: 'error',
    description: 'Rejected by seller',
  },
  pickup_scheduled: {
    label: 'Pickup Scheduled',
    color: 'primary',
    description: 'Pickup scheduled',
  },
  in_transit: {
    label: 'In Transit',
    color: 'secondary',
    description: 'Being returned',
  },
  received: {
    label: 'Received',
    color: 'tertiary',
    description: 'Received at warehouse',
  },
  qc_pending: {
    label: 'QC Pending',
    color: 'pending',
    description: 'Awaiting quality check',
  },
  qc_passed: {
    label: 'QC Passed',
    color: 'success',
    description: 'QC passed',
  },
  qc_failed: {
    label: 'QC Failed',
    color: 'error',
    description: 'QC failed',
  },
  refund_initiated: {
    label: 'Refund Initiated',
    color: 'alert',
    description: 'Refund processing',
  },
  refund_completed: {
    label: 'Refund Completed',
    color: 'success',
    description: 'Refund completed',
  },
  closed: {
    label: 'Closed',
    color: 'neutral',
    description: 'Return closed',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// NDR STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Fix for NDRStatus type mismatch: cast to any or Record<string, StatusConfig> to allow extra statuses
export const NDR_STATUS_CONFIG: Record<string, StatusConfig> = {
  open: {
    label: 'Open',
    color: 'info',
    description: 'New NDR case',
  },
  in_progress: {
    label: 'In Progress',
    color: 'warning',
    description: 'Action taken, awaiting response',
  },
  customer_action: {
    label: 'Customer Action',
    color: 'secondary',
    description: 'Awaiting customer response',
  },
  reattempt_scheduled: {
    label: 'Reattempt Scheduled',
    color: 'primary',
    description: 'Delivery reattempt scheduled',
  },
  resolved: {
    label: 'Resolved',
    color: 'success',
    description: 'Successfully resolved',
  },
  escalated: {
    label: 'Escalated',
    color: 'pending',
    description: 'Escalated to admin',
  },
  converted_to_rto: {
    label: 'Converted to RTO',
    color: 'error',
    description: 'Failed, converting to RTO',
  },
  detected: {
    label: 'Detected',
    color: 'warning',
    description: 'Issue detected',
  },
  in_resolution: {
    label: 'In Resolution',
    color: 'info',
    description: 'Resolution in progress',
  },
  rto_triggered: {
    label: 'RTO Triggered',
    color: 'error',
    description: 'RTO process started',
  },
  action_required: {
    label: 'Action Required',
    color: 'error',
    description: 'Action required by seller',
  },
  pending_seller: {
    label: 'Pending Seller',
    color: 'warning',
    description: 'Waiting for seller response',
  },
};

// ... (other configs)



// ═══════════════════════════════════════════════════════════════════════════
// MANIFEST STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const MANIFEST_STATUS_CONFIG: Record<ManifestStatus, StatusConfig> = {
  open: {
    label: 'Open',
    color: 'warning',
    description: 'Manifest created and editable',
  },
  closed: {
    label: 'Closed',
    color: 'info',
    description: 'Pickup scheduled and manifest closed',
  },
  handed_over: {
    label: 'Handed Over',
    color: 'success',
    description: 'Shipments handed over to courier',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DISPUTE STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const DISPUTE_STATUS_CONFIG: Record<DisputeStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'Awaiting seller response',
  },
  under_review: {
    label: 'Under Review',
    color: 'info',
    description: 'Seller submitted evidence',
  },
  seller_response: {
    label: 'Seller Response',
    color: 'secondary',
    description: 'Seller responded',
  },
  auto_resolved: {
    label: 'Auto Resolved',
    color: 'success',
    description: 'Auto-resolved after 7 days',
  },
  manual_resolved: {
    label: 'Manually Resolved',
    color: 'success',
    description: 'Admin manually resolved',
  },
  closed: {
    label: 'Closed',
    color: 'neutral',
    description: 'Dispute closed',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// REMITTANCE STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const REMITTANCE_STATUS_CONFIG: Record<RemittanceStatus, StatusConfig> = {
  pending_approval: {
    label: 'Pending Approval',
    color: 'warning',
    description: 'Remittance pending approval',
  },
  approved: {
    label: 'Approved',
    color: 'info',
    description: 'Remittance approved',
  },
  payout_initiated: {
    label: 'Payout Initiated',
    color: 'pending',
    description: 'Payout has been initiated',
  },
  completed: {
    label: 'Completed',
    color: 'success',
    description: 'Remittance completed',
  },
  failed: {
    label: 'Failed',
    color: 'error',
    description: 'Remittance failed',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'neutral',
    description: 'Remittance cancelled',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYOUT STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'Payout pending',
  },
  processing: {
    label: 'Processing',
    color: 'pending',
    description: 'Payout being processed',
  },
  processed: {
    label: 'Processed',
    color: 'success',
    description: 'Payout processed successfully',
  },
  reversed: {
    label: 'Reversed',
    color: 'error',
    description: 'Payout reversed',
  },
  failed: {
    label: 'Failed',
    color: 'error',
    description: 'Payout failed',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const WEBHOOK_STATUS_CONFIG: Record<WebhookStatus, StatusConfig> = {
  active: {
    label: 'Active',
    color: 'success',
    description: 'Webhook is active',
  },
  inactive: {
    label: 'Inactive',
    color: 'neutral',
    description: 'Webhook is inactive',
  },
  error: {
    label: 'Error',
    color: 'error',
    description: 'Webhook has errors',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC STATUS TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generic status types for common statuses that aren't domain-specific
 */
export const COMMON_STATUS_CONFIG = {
  open: { label: 'Open', color: 'info' as const },
  closed: { label: 'Closed', color: 'neutral' as const },
  active: { label: 'Active', color: 'success' as const },
  inactive: { label: 'Inactive', color: 'neutral' as const },
  pending: { label: 'Pending', color: 'warning' as const },
  approved: { label: 'Approved', color: 'info' as const },
  rejected: { label: 'Rejected', color: 'error' as const },
  completed: { label: 'Completed', color: 'success' as const },
  failed: { label: 'Failed', color: 'error' as const },
  processing: { label: 'Processing', color: 'pending' as const },
  error: { label: 'Error', color: 'error' as const },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// COMPANY STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const COMPANY_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending_verification: {
    label: 'Pending Verification',
    color: 'warning',
    description: 'Company pending verification'
  },
  kyc_submitted: {
    label: 'KYC Submitted',
    color: 'info',
    description: 'KYC documents submitted'
  },
  approved: {
    label: 'Approved',
    color: 'success',
    description: 'Company approved'
  },
  suspended: {
    label: 'Suspended',
    color: 'error',
    description: 'Company suspended'
  },
  rejected: {
    label: 'Rejected',
    color: 'error',
    description: 'Company rejected'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// COUPON STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const COUPON_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    label: 'Active',
    color: 'success',
    description: 'Coupon is active'
  },
  inactive: {
    label: 'Inactive',
    color: 'neutral',
    description: 'Coupon is inactive'
  },
  expired: {
    label: 'Expired',
    color: 'error',
    description: 'Coupon has expired'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// COURIER STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const COURIER_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    label: 'Active',
    color: 'success',
    description: 'Courier service is active'
  },
  inactive: {
    label: 'Inactive',
    color: 'neutral',
    description: 'Courier service is inactive'
  },
  maintenance: {
    label: 'Maintenance',
    color: 'warning',
    description: 'Courier under maintenance'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// RATE CARD STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const RATECARD_STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: {
    label: 'Draft',
    color: 'neutral',
    description: 'Rate card in draft state'
  },
  active: {
    label: 'Active',
    color: 'success',
    description: 'Rate card is active'
  },
  inactive: {
    label: 'Inactive',
    color: 'warning',
    description: 'Rate card is inactive'
  },
  expired: {
    label: 'Expired',
    color: 'error',
    description: 'Rate card has expired'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// COMMISSION STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const COMMISSION_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'Commission pending approval'
  },
  approved: {
    label: 'Approved',
    color: 'success',
    description: 'Commission approved'
  },
  rejected: {
    label: 'Rejected',
    color: 'error',
    description: 'Commission rejected'
  },
  paid: {
    label: 'Paid',
    color: 'info',
    description: 'Commission paid to sales rep'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// KYC STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const KYC_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'Awaiting verification'
  },
  verified: {
    label: 'Verified',
    color: 'success',
    description: 'KYC verified successfully'
  },
  rejected: {
    label: 'Rejected',
    color: 'error',
    description: 'KYC rejected'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ORDER STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  new: {
    label: 'New',
    color: 'info',
    description: 'Order placed'
  },
  ready: {
    label: 'Ready',
    color: 'pending',
    description: 'Ready for pickup'
  },
  shipped: {
    label: 'Shipped',
    color: 'primary',
    description: 'Order shipped'
  },
  delivered: {
    label: 'Delivered',
    color: 'success',
    description: 'Order delivered'
  },
  rto: {
    label: 'RTO',
    color: 'error',
    description: 'Returned to origin'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'error',
    description: 'Order cancelled'
  },
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'Order pending'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

type StatusConfigMap =
  | typeof RETURN_STATUS_CONFIG
  | typeof NDR_STATUS_CONFIG
  | typeof MANIFEST_STATUS_CONFIG
  | typeof DISPUTE_STATUS_CONFIG
  | typeof REMITTANCE_STATUS_CONFIG
  | typeof PAYOUT_STATUS_CONFIG
  | typeof WEBHOOK_STATUS_CONFIG
  | typeof COMPANY_STATUS_CONFIG
  | typeof COUPON_STATUS_CONFIG
  | typeof COURIER_STATUS_CONFIG
  | typeof RATECARD_STATUS_CONFIG
  | typeof KYC_STATUS_CONFIG
  | typeof ORDER_STATUS_CONFIG
  | typeof COMMISSION_STATUS_CONFIG
  | typeof BILLING_STATUS_CONFIG
  | typeof BILLING_STATUS_CONFIG
  | typeof SALES_REP_STATUS_CONFIG
  | typeof PICKUP_STATUS_CONFIG
  | typeof QC_STATUS_CONFIG;

// ═══════════════════════════════════════════════════════════════════════════
// BILLING STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const BILLING_STATUS_CONFIG: Record<string, StatusConfig> = {
  success: {
    label: 'Success',
    color: 'success',
    description: 'Transaction successful',
  },
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'Transaction pending',
  },
  failed: {
    label: 'Failed',
    color: 'error',
    description: 'Transaction failed',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SALES REP STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const SALES_REP_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    label: 'Active',
    color: 'success',
    description: 'Sales representative is active',
  },
  inactive: {
    label: 'Inactive',
    color: 'neutral',
    description: 'Sales representative is inactive',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const INTEGRATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  connected: {
    label: 'Connected',
    color: 'success',
    description: 'Integration active',
  },
  disconnected: {
    label: 'Disconnected',
    color: 'neutral',
    description: 'Integration inactive',
  },
  error: {
    label: 'Error',
    color: 'error',
    description: 'Sync error',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// USER STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const USER_STATUS_CONFIG: Record<string, StatusConfig> = {
  Active: {
    label: 'Active',
    color: 'success',
    description: 'User active',
  },
  Inactive: {
    label: 'Inactive',
    color: 'neutral',
    description: 'User inactive',
  },
};



// ═══════════════════════════════════════════════════════════════════════════
// INVENTORY STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const INVENTORY_STATUS_CONFIG: Record<string, StatusConfig> = {
  'In Stock': {
    label: 'In Stock',
    color: 'success',
    description: 'Item in stock',
  },
  'Low Stock': {
    label: 'Low Stock',
    color: 'warning',
    description: 'Stock running low',
  },
  'Out of Stock': {
    label: 'Out of Stock',
    color: 'error',
    description: 'Item out of stock',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT TICKET STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const SUPPORT_TICKET_STATUS_CONFIG: Record<string, StatusConfig> = {
  open: {
    label: 'Open',
    color: 'info',
    description: 'New ticket',
  },
  in_progress: {
    label: 'In Progress',
    color: 'warning',
    description: 'Ticket being worked on',
  },
  resolved: {
    label: 'Resolved',
    color: 'success',
    description: 'Ticket resolved',
  },
  closed: {
    label: 'Closed',
    color: 'neutral',
    description: 'Ticket closed',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT PRIORITY CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const SUPPORT_PRIORITY_CONFIG: Record<string, StatusConfig> = {
  high: {
    label: 'High',
    color: 'error',
    description: 'High priority',
  },
  medium: {
    label: 'Medium',
    color: 'warning',
    description: 'Medium priority',
  },
  low: {
    label: 'Low',
    color: 'success',
    description: 'Low priority',
  },
  critical: {
    label: 'Critical',
    color: 'error',
    description: 'Critical priority',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// RTO STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const RTO_STATUS_CONFIG: Record<string, StatusConfig> = {
  initiated: {
    label: 'Initiated',
    color: 'info',
    description: 'RTO Initiated',
  },
  in_transit: {
    label: 'In Transit',
    color: 'warning',
    description: 'RTO In Transit',
  },
  delivered_to_warehouse: {
    label: 'Delivered to Warehouse',
    color: 'neutral',
    description: 'RTO Delivered to Warehouse',
  },
  qc_pending: {
    label: 'QC Pending',
    color: 'warning',
    description: 'Quality Check Pending',
  },
  qc_completed: {
    label: 'QC Completed',
    color: 'primary',
    description: 'Quality Check Completed',
  },
  restocked: {
    label: 'Restocked',
    color: 'success',
    description: 'Item Restocked',
  },
  disposed: {
    label: 'Disposed',
    color: 'error',
    description: 'Item Disposed',
  },
  refurbishing: {
    label: 'Refurbishing',
    color: 'secondary',
    description: 'Item Refurbishing',
  },
  claim_filed: {
    label: 'Claim Filed',
    color: 'pending',
    description: 'Claim Filed',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SHIPMENT STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const SHIPMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'Shipment created, waiting for pickup',
  },
  created: {
    label: 'Created',
    color: 'info',
    description: 'Shipment manifest created',
  },
  'in-transit': {
    label: 'In Transit',
    color: 'primary',
    description: 'Shipment is on the way',
  },
  in_transit: {
    label: 'In Transit',
    color: 'primary',
    description: 'Shipment is on the way',
  },
  shipped: {
    label: 'Shipped',
    color: 'primary',
    description: 'Shipment has been shipped',
  },
  delivered: {
    label: 'Delivered',
    color: 'success',
    description: 'Shipment delivered successfully',
  },
  rto: {
    label: 'RTO',
    color: 'error',
    description: 'Return to Origin initiated',
  },
  ndr: {
    label: 'NDR',
    color: 'warning',
    description: 'Non-Delivery Report',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'error',
    description: 'Shipment cancelled',
  },
  lost: {
    label: 'Lost',
    color: 'error',
    description: 'Shipment lost in transit',
  },
  damaged: {
    label: 'Damaged',
    color: 'error',
    description: 'Shipment damaged',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  paid: {
    label: 'Paid',
    color: 'success',
    description: 'Payment successful',
  },
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'Payment pending',
  },
  failed: {
    label: 'Failed',
    color: 'error',
    description: 'Payment failed',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PICKUP STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const PICKUP_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'Pickup pending',
  },
  scheduled: {
    label: 'Scheduled',
    color: 'info',
    description: 'Pickup scheduled',
  },
  completed: {
    label: 'Completed',
    color: 'success',
    description: 'Pickup completed',
  },
  failed: {
    label: 'Failed',
    color: 'error',
    description: 'Pickup failed',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'neutral',
    description: 'Pickup cancelled',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// QC STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const QC_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    description: 'QC pending',
  },
  passed: {
    label: 'Passed',
    color: 'success',
    description: 'QC passed',
  },
  failed: {
    label: 'Failed',
    color: 'error',
    description: 'QC failed',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION TYPE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const TRANSACTION_TYPE_CONFIG: Record<string, StatusConfig> = {
  credit: {
    label: 'Credit',
    color: 'success',
    description: 'Amount credited',
  },
  debit: {
    label: 'Debit',
    color: 'error',
    description: 'Amount debited',
  },
};

/**
 * Get status configuration for a specific domain and status
 */
export function getStatusConfig(
  domain:
    | 'return'
    | 'ndr'
    | 'manifest'
    | 'dispute'
    | 'remittance'
    | 'payout'
    | 'webhook'
    | 'company'
    | 'coupon'
    | 'courier'
    | 'ratecard'
    | 'kyc'
    | 'order'
    | 'commission'
    | 'billing'
    | 'sales_rep'
    | 'integration'
    | 'user'
    | 'warehouse'
    | 'inventory'
    | 'support_ticket'
    | 'support_priority'
    | 'shipment'
    | 'payment'
    | 'rto'
    | 'transaction_type'
    | 'pickup'
    | 'qc',
  status: string
): StatusConfig | undefined {
  const configs: Record<string, StatusConfigMap> = {
    return: RETURN_STATUS_CONFIG,
    ndr: NDR_STATUS_CONFIG,
    manifest: MANIFEST_STATUS_CONFIG,
    dispute: DISPUTE_STATUS_CONFIG,
    remittance: REMITTANCE_STATUS_CONFIG,
    payout: PAYOUT_STATUS_CONFIG,
    webhook: WEBHOOK_STATUS_CONFIG,
    company: COMPANY_STATUS_CONFIG,
    coupon: COUPON_STATUS_CONFIG,
    courier: COURIER_STATUS_CONFIG,
    ratecard: RATECARD_STATUS_CONFIG,
    kyc: KYC_STATUS_CONFIG,
    order: ORDER_STATUS_CONFIG,
    commission: COMMISSION_STATUS_CONFIG,
    billing: BILLING_STATUS_CONFIG,
    sales_rep: SALES_REP_STATUS_CONFIG,
    integration: INTEGRATION_STATUS_CONFIG,
    user: USER_STATUS_CONFIG,
    warehouse: WAREHOUSE_STATUS_CONFIG,
    inventory: INVENTORY_STATUS_CONFIG,
    support_ticket: SUPPORT_TICKET_STATUS_CONFIG,
    support_priority: SUPPORT_PRIORITY_CONFIG,
    shipment: SHIPMENT_STATUS_CONFIG,
    payment: PAYMENT_STATUS_CONFIG,
    rto: RTO_STATUS_CONFIG,
    transaction_type: TRANSACTION_TYPE_CONFIG,
    pickup: PICKUP_STATUS_CONFIG,
    qc: QC_STATUS_CONFIG,
  };

  const domainConfig = configs[domain];
  if (!domainConfig) return undefined;

  // Cast to Record<string, StatusConfig> to allow string indexing
  const typedConfig = domainConfig as Record<string, StatusConfig>;
  return typedConfig[status] || typedConfig[status.toLowerCase()];
}

/**
 * Get CSS color class for a status
 */
export function getStatusColorClass(
  domain: Parameters<typeof getStatusConfig>[0],
  status: string
): string {
  const config = getStatusConfig(domain, status);
  return config ? STATUS_COLORS[config.color] : STATUS_COLORS.neutral;
}

/**
 * Get status label for a status
 */
export function getStatusLabel(
  domain: Parameters<typeof getStatusConfig>[0],
  status: string
): string {
  const config = getStatusConfig(domain, status);
  return config?.label || status;
}

/**
 * Master status configuration object
 * Access via: STATUS_CONFIGS.return.approved
 */
export const STATUS_CONFIGS = {
  return: RETURN_STATUS_CONFIG,
  ndr: NDR_STATUS_CONFIG,
  manifest: MANIFEST_STATUS_CONFIG,
  dispute: DISPUTE_STATUS_CONFIG,
  remittance: REMITTANCE_STATUS_CONFIG,
  payout: PAYOUT_STATUS_CONFIG,
  webhook: WEBHOOK_STATUS_CONFIG,
  company: COMPANY_STATUS_CONFIG,
  coupon: COUPON_STATUS_CONFIG,
  courier: COURIER_STATUS_CONFIG,
  ratecard: RATECARD_STATUS_CONFIG,
  kyc: KYC_STATUS_CONFIG,
  order: ORDER_STATUS_CONFIG,
  commission: COMMISSION_STATUS_CONFIG,
  billing: BILLING_STATUS_CONFIG,
  sales_rep: SALES_REP_STATUS_CONFIG,
  integration: INTEGRATION_STATUS_CONFIG,
  user: USER_STATUS_CONFIG,
  warehouse: WAREHOUSE_STATUS_CONFIG,
  inventory: INVENTORY_STATUS_CONFIG,
  support_ticket: SUPPORT_TICKET_STATUS_CONFIG,
  support_priority: SUPPORT_PRIORITY_CONFIG,
  shipment: SHIPMENT_STATUS_CONFIG,
  payment: PAYMENT_STATUS_CONFIG,
  rto: RTO_STATUS_CONFIG,
  transaction_type: TRANSACTION_TYPE_CONFIG,
  pickup: PICKUP_STATUS_CONFIG,
  qc: QC_STATUS_CONFIG,
} as const;
