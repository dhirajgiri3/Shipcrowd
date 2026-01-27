/**
 * SLA Configuration and Utilities
 * Defines SLA response thresholds and breach detection logic
 */

export const SLA_THRESHOLDS = {
  critical: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
  high: 8 * 60 * 60 * 1000, // 8 hours
  medium: 24 * 60 * 60 * 1000, // 24 hours
  low: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

export type Priority = keyof typeof SLA_THRESHOLDS;

/**
 * Check if a ticket has breached its SLA
 * @param priority - Ticket priority level
 * @param createdAt - When ticket was created
 * @param status - Current ticket status
 * @returns true if SLA is breached, false otherwise
 */
export function isSLABreached(
  priority: Priority,
  createdAt: Date,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): boolean {
  // Resolved or closed tickets don't breach SLA
  if (status === 'resolved' || status === 'closed') {
    return false;
  }

  const createdTime = new Date(createdAt).getTime();
  const currentTime = new Date().getTime();
  const elapsedTime = currentTime - createdTime;
  const threshold = SLA_THRESHOLDS[priority] || SLA_THRESHOLDS.medium;

  return elapsedTime > threshold;
}

/**
 * Calculate remaining time before SLA breach
 * @returns remaining milliseconds, or null if already breached
 */
export function getRemainingTime(
  priority: Priority,
  createdAt: Date,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): number | null {
  if (status === 'resolved' || status === 'closed') {
    return null;
  }

  const createdTime = new Date(createdAt).getTime();
  const currentTime = new Date().getTime();
  const elapsedTime = currentTime - createdTime;
  const threshold = SLA_THRESHOLDS[priority] || SLA_THRESHOLDS.medium;

  const remaining = threshold - elapsedTime;
  return remaining > 0 ? remaining : null;
}

/**
 * Convert milliseconds to human-readable format
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'Breached';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get SLA status badge color and text
 */
export function getSLAStatus(
  priority: Priority,
  createdAt: Date,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): {
  status: 'on_track' | 'warning' | 'breached';
  color: 'green' | 'yellow' | 'red';
  text: string;
} {
  if (status === 'resolved' || status === 'closed') {
    return { status: 'on_track', color: 'green', text: 'Resolved' };
  }

  const remaining = getRemainingTime(priority, createdAt, status);

  if (remaining === null) {
    return { status: 'breached', color: 'red', text: 'SLA Breached' };
  }

  // Warning if less than 1 hour remaining
  if (remaining < 60 * 60 * 1000) {
    return { status: 'warning', color: 'yellow', text: 'Warning' };
  }

  return { status: 'on_track', color: 'green', text: 'On Track' };
}
