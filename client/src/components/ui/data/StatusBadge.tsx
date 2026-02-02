/**
 * StatusBadge Component
 *
 * Type-safe status badge component that uses centralized status configurations.
 * Replaces hardcoded status rendering logic across 5+ table components.
 *
 * Features:
 * - Type-safe status values
 * - Consistent styling across all domains
 * - Optional icons and descriptions
 * - Dark mode support
 * - Customizable size
 *
 * Usage:
 * ```typescript
 * import { StatusBadge } from '@/src/components/ui';
 *
 * // Simple usage
 * <StatusBadge domain="return" status="approved" />
 * <StatusBadge domain="ndr" status="open" />
 *
 * // With additional features
 * <StatusBadge domain="manifest" status="PICKED_UP" showTooltip />
 * <StatusBadge domain="dispute" status="under_investigation" size="lg" />
 * ```
 */

import React from 'react';
import { cn } from '@/src/lib/utils';
import {
  STATUS_COLORS,
  getStatusConfig,
  getStatusLabel,
  type STATUS_CONFIGS,
} from '@/src/config/status.config';
import { Badge } from '@/src/components/ui/core/Badge';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';

export type StatusDomain = keyof typeof STATUS_CONFIGS;

export type ReturnStatusValue = keyof typeof STATUS_CONFIGS.return;
export type NDRStatusValue = keyof typeof STATUS_CONFIGS.ndr;
export type ManifestStatusValue = keyof typeof STATUS_CONFIGS.manifest;
export type DisputeStatusValue = keyof typeof STATUS_CONFIGS.dispute;
export type RemittanceStatusValue = keyof typeof STATUS_CONFIGS.remittance;
export type PayoutStatusValue = keyof typeof STATUS_CONFIGS.payout;
export type WebhookStatusValue = keyof typeof STATUS_CONFIGS.webhook;
export type CompanyStatusValue = keyof typeof STATUS_CONFIGS.company;
export type CouponStatusValue = keyof typeof STATUS_CONFIGS.coupon;
export type CourierStatusValue = keyof typeof STATUS_CONFIGS.courier;

export type StatusValue =
  | ReturnStatusValue
  | NDRStatusValue
  | ManifestStatusValue
  | DisputeStatusValue
  | RemittanceStatusValue
  | PayoutStatusValue
  | WebhookStatusValue
  | CompanyStatusValue
  | CouponStatusValue
  | CourierStatusValue
  | string;

export interface StatusBadgeProps {
  /**
   * The domain/category of the status
   * If not provided, will attempt to infer from status value or use generic styling
   */
  domain?: StatusDomain;

  /**
   * The status value to display
   */
  status: StatusValue;

  /**
   * Optional size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Show icon from config (if available)
   * @default false
   */
  showIcon?: boolean;

  /**
   * Show tooltip with description
   * @default false
   */
  showTooltip?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Click handler if this should be interactive
   */
  onClick?: () => void;

  /**
   * Make badge clickable
   * @default false
   */
  interactive?: boolean;
}

/**
 * StatusBadge Component
 *
 * Renders a styled badge for any domain-specific status using centralized configuration
 */
export const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  (
    {
      domain,
      status,
      size = 'md',
      showIcon = false,
      showTooltip = false,
      className,
      onClick,
      interactive = false,
    },
    ref
  ) => {
    // If domain is provided, use config system
    if (domain) {
      const config = getStatusConfig(domain, String(status));

      // Fallback if status not found in config
      if (!config) {
        return (
          <Badge className={className}>
            {String(status)}
          </Badge>
        );
      }

      const colorClass = STATUS_COLORS[config.color];
      const label = config.label;

      const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
      };

      const badgeContent = (
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full font-medium transition-colors',
            colorClass,
            sizeClasses[size],
            interactive && 'cursor-pointer hover:opacity-80',
            className
          )}
          onClick={onClick}
          ref={ref}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onClick?.();
                }
              }
              : undefined
          }
        >
          {showIcon && config.icon && <span className="text-lg">{config.icon}</span>}
          <span>{label}</span>
        </div>
      );

      // Wrap with tooltip if description exists and tooltip is enabled
      if (showTooltip && config.description) {
        return (
          <Tooltip content={config.description} side="top">
            {badgeContent}
          </Tooltip>
        );
      }

      return badgeContent;
    }

    // Fallback: No domain provided - use simple Badge with basic styling
    // Try to infer color from common status patterns
    const statusStr = String(status).toLowerCase();
    let variant: 'default' | 'success' | 'warning' | 'error' | 'info' = 'default';

    if (statusStr.includes('delivered') || statusStr.includes('approved') || statusStr.includes('completed') || statusStr.includes('success')) {
      variant = 'success';
    } else if (statusStr.includes('pending') || statusStr.includes('processing') || statusStr.includes('in_progress') || statusStr.includes('in-transit')) {
      variant = 'warning';
    } else if (statusStr.includes('failed') || statusStr.includes('rejected') || statusStr.includes('cancelled') || statusStr.includes('rto')) {
      variant = 'error';
    } else if (statusStr.includes('open') || statusStr.includes('new')) {
      variant = 'info';
    }

    return (
      <Badge variant={variant} className={className}>
        {String(status).replace(/_/g, ' ').replace(/-/g, ' ')}
      </Badge>
    );
  }
);


StatusBadge.displayName = 'StatusBadge';

/**
 * Batch StatusBadge Component
 *
 * Render multiple status badges for a list of statuses
 */
export interface StatusBadgesProps {
  domain: StatusDomain;
  statuses: StatusValue[];
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
  gap?: 'xs' | 'sm' | 'md' | 'lg';
}

export const StatusBadges = React.forwardRef<HTMLDivElement, StatusBadgesProps>(
  (
    { domain, statuses, size = 'md', showIcon = false, showTooltip = false, className, gap = 'sm' },
    ref
  ) => {
    const gapClasses = {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-wrap items-center', gapClasses[gap], className)}
      >
        {statuses.map((status, index) => (
          <StatusBadge
            key={`${domain}-${status}-${index}`}
            domain={domain}
            status={status}
            size={size}
            showIcon={showIcon}
            showTooltip={showTooltip}
          />
        ))}
      </div>
    );
  }
);

StatusBadges.displayName = 'StatusBadges';

export default StatusBadge;
