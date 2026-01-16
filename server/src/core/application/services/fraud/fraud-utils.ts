/**
 * Fraud Detection Utilities
 *
 * Helper functions for fraud detection operations including:
 * - Risk score calculations
 * - Data normalization
 * - Pattern detection
 * - Threshold validation
 */

/**
 * Validate if a score is within acceptable range
 */
export function isValidFraudScore(score: number): boolean {
    return typeof score === 'number' && score >= 0 && score <= 100;
}

/**
 * Get risk level color for UI representation
 */
export function getRiskLevelColor(
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
): string {
    const colorMap = {
        low: '#22c55e',      // Green
        medium: '#f59e0b',   // Amber
        high: '#ef4444',     // Red
        critical: '#991b1b', // Dark Red
    };
    return colorMap[riskLevel];
}

/**
 * Get risk level severity number (0-3)
 */
export function getRiskLevelSeverity(
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
): number {
    const severityMap = {
        low: 0,
        medium: 1,
        high: 2,
        critical: 3,
    };
    return severityMap[riskLevel];
}

/**
 * Normalize phone number for fraud detection matching
 */
export function normalizePhone(phone: string): string {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
}

/**
 * Normalize email for fraud detection matching
 */
export function normalizeEmail(email: string): string {
    // Convert to lowercase and trim whitespace
    return email.toLowerCase().trim();
}

/**
 * Normalize address for fraud detection matching
 */
export function normalizeAddress(address: string): string {
    // Convert to lowercase, remove punctuation, normalize spaces
    return address
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Normalize IP address
 */
export function normalizeIP(ip: string): string {
    return ip.trim();
}

/**
 * Calculate average fraud score
 */
export function calculateAverageScore(scores: number[]): number {
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return sum / scores.length;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone format (basic)
 */
export function isValidPhone(phone: string): boolean {
    const normalized = normalizePhone(phone);
    return normalized.length >= 10 && normalized.length <= 15;
}

/**
 * Check if value is suspicious (basic heuristic)
 */
export function isSuspiciousValue(value: number, baselineValue: number): boolean {
    if (baselineValue === 0) return false;
    const multiplier = value / baselineValue;
    // Suspicious if 3x or more than baseline
    return multiplier >= 3;
}

/**
 * Calculate velocity score based on order count
 */
export function calculateVelocityScore(
    orderCount: number,
    timeWindowMinutes: number = 60
): number {
    // Formula: more orders in shorter time = higher risk
    const baseRate = 5; // Expected orders per hour
    const expectedOrders = (baseRate * timeWindowMinutes) / 60;

    if (orderCount <= expectedOrders) return 0;

    const excess = orderCount - expectedOrders;
    const percentageOver = (excess / expectedOrders) * 100;

    // Cap at 20 points max
    return Math.min(Math.ceil(percentageOver / 10), 20);
}

/**
 * Format fraud alert ID for display
 */
export function formatAlertId(alertId: string): string {
    // Format: FRD-YYYYMMDD-XXXXX -> FRD-2025-01-16-00001
    const match = alertId.match(/FRD-(\d{4})(\d{2})(\d{2})-(\d+)/);
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}-${match[4]}`;
    }
    return alertId;
}

/**
 * Get fraud risk description
 */
export function getRiskDescription(
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
): string {
    const descriptions = {
        low: 'Low fraud risk - Order can be safely processed',
        medium: 'Medium fraud risk - Order should be reviewed before processing',
        high: 'High fraud risk - Order requires immediate review',
        critical: 'Critical fraud risk - Order should be blocked immediately',
    };
    return descriptions[riskLevel];
}

/**
 * Get action recommendation label
 */
export function getActionLabel(action: 'approve' | 'review' | 'block'): string {
    const labels = {
        approve: 'Approve Order',
        review: 'Review Required',
        block: 'Block Order',
    };
    return labels[action];
}

/**
 * Batch calculate fraud scores efficiently
 */
export function batchCalculateRiskLevel(
    scores: number[]
): Array<'low' | 'medium' | 'high' | 'critical'> {
    return scores.map(score => {
        if (score >= 76) return 'critical';
        if (score >= 51) return 'high';
        if (score >= 26) return 'medium';
        return 'low';
    });
}

/**
 * Create fraud investigation summary
 */
export function createInvestigationSummary(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    matchedRulesCount: number,
    blacklistMatchCount: number,
    hasAIAnalysis: boolean
): string {
    const parts: string[] = [];

    if (matchedRulesCount > 0) {
        parts.push(`${matchedRulesCount} fraud rule(s) matched`);
    }

    if (blacklistMatchCount > 0) {
        parts.push(`${blacklistMatchCount} blacklist match(es) found`);
    }

    if (hasAIAnalysis) {
        parts.push('AI analysis completed');
    }

    const baseMessage = `[${riskLevel.toUpperCase()}] ${getRiskDescription(riskLevel)}`;

    if (parts.length === 0) {
        return baseMessage;
    }

    return `${baseMessage}. Details: ${parts.join(', ')}.`;
}
