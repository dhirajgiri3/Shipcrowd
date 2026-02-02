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
  success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  pending: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  primary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  secondary: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  tertiary: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  alert: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
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

export const NDR_STATUS_CONFIG: Record<NDRStatus, StatusConfig> = {
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
};

// ═══════════════════════════════════════════════════════════════════════════
// MANIFEST STATUS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const MANIFEST_STATUS_CONFIG: Record<ManifestStatus, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    color: 'neutral',
    description: 'Manifest in draft state',
  },
  CREATED: {
    label: 'Created',
    color: 'info',
    description: 'Manifest created',
  },
  PICKUP_SCHEDULED: {
    label: 'Pickup Scheduled',
    color: 'warning',
    description: 'Pickup scheduled with courier',
  },
  PICKUP_IN_PROGRESS: {
    label: 'Pickup In Progress',
    color: 'pending',
    description: 'Courier is picking up shipments',
  },
  PICKED_UP: {
    label: 'Picked Up',
    color: 'success',
    description: 'All shipments picked up',
  },
  PARTIALLY_PICKED: {
    label: 'Partially Picked',
    color: 'warning',
    description: 'Some shipments picked up',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'error',
    description: 'Manifest cancelled',
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
  | typeof COURIER_STATUS_CONFIG;

/**
 * Get status configuration for a specific domain and status
 */
export function getStatusConfig(
  domain: 'return' | 'ndr' | 'manifest' | 'dispute' | 'remittance' | 'payout' | 'webhook' | 'company' | 'coupon' | 'courier',
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
  };

  const config = configs[domain];
  return config ? (config as any)[status] : undefined;
}

/**
 * Get CSS color class for a status
 */
export function getStatusColorClass(
  domain: 'return' | 'ndr' | 'manifest' | 'dispute' | 'remittance' | 'payout' | 'webhook' | 'company' | 'coupon' | 'courier',
  status: string
): string {
  const config = getStatusConfig(domain, status);
  return config ? STATUS_COLORS[config.color] : STATUS_COLORS.neutral;
}

/**
 * Get status label for a status
 */
export function getStatusLabel(
  domain: 'return' | 'ndr' | 'manifest' | 'dispute' | 'remittance' | 'payout' | 'webhook' | 'company' | 'coupon' | 'courier',
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
} as const;
