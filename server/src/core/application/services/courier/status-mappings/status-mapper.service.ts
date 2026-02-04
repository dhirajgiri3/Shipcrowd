/**
 * Centralized Status Mapper Service
 * 
 * Provides a single source of truth for mapping courier-specific statuses
 * to internal normalized statuses across all courier integrations.
 * 
 * Benefits:
 * - No duplication across 15 courier providers
 * - Single place to update status mappings
 * - Rich metadata for business rules (cancellable, reattemptable, etc.)
 * 
 * Usage:
 * 1. Register courier mappings at boot time
 * 2. Use StatusMapperService.map() in courier providers
 * 3. Use helper methods for business logic
 */

import logger from "@/shared/logger/winston.logger";

/**
 * Normalized status mapping with business rule metadata
 */
export interface CourierStatusMapping {
    externalStatus: string;      // What courier returns (e.g. "DELIVERED", "Dispatched")
    internalStatus: string;       // Our normalized status (e.g. "delivered", "out_for_delivery")
    statusCategory: 'pending' | 'in_transit' | 'delivered' | 'failed' | 'rto' | 'cancelled';
    isTerminal: boolean;          // Is this a final state? (no further updates expected)
    allowsReattempt: boolean;     // Can request re-delivery from this status?
    allowsCancellation: boolean;  // Can cancel shipment from this status?
}

/**
 * Configuration for registering courier status mappings
 */
export interface CourierMappingConfig {
    courier: string;              // Courier identifier (e.g. 'velocity', 'delhivery')
    mappings: CourierStatusMapping[];
    caseSensitive?: boolean;      // If true, exact case matching required
}

/**
 * Centralized Status Mapper Service
 * 
 * Register all courier status mappings at application boot,
 * then use throughout the application for consistent status handling.
 */
export class StatusMapperService {
    private static registry = new Map<string, Map<string, CourierStatusMapping>>();
    private static caseSensitivity = new Map<string, boolean>();

    /**
     * Register status mappings for a courier
     * Call this at application boot time for each courier
     */
    static register(config: CourierMappingConfig): void {
        const normalizedMappings = new Map<string, CourierStatusMapping>();

        config.mappings.forEach(mapping => {
            const key = config.caseSensitive
                ? mapping.externalStatus
                : mapping.externalStatus.toLowerCase().trim();

            normalizedMappings.set(key, mapping);
        });

        this.registry.set(config.courier, normalizedMappings);
        this.caseSensitivity.set(config.courier, config.caseSensitive ?? false);

        logger.info(`Status mappings registered for courier: ${config.courier}`, {
            count: config.mappings.length,
            caseSensitive: config.caseSensitive ?? false
        });
    }

    /**
     * Map external courier status to internal status with metadata
     * 
     * @param courier - Courier identifier (e.g. 'velocity', 'delhivery')
     * @param externalStatus - Status string returned by courier API
     * @returns Mapped status with metadata, or unknown status if not found
     */
    static map(courier: string, externalStatus: string): CourierStatusMapping {
        const mappings = this.registry.get(courier);

        if (!mappings) {
            logger.error(`No status mappings registered for courier: ${courier}`);
            throw new Error(`No status mappings registered for courier: ${courier}. Did you forget to register at boot?`);
        }

        const caseSensitive = this.caseSensitivity.get(courier) ?? false;
        const key = caseSensitive
            ? externalStatus.trim()
            : externalStatus.toLowerCase().trim();

        const mapping = mappings.get(key);

        if (!mapping) {
            // Return unknown status with safe defaults
            logger.warn(`Unknown status for ${courier}: "${externalStatus}"`, {
                externalStatus,
                availableStatuses: Array.from(mappings.keys())
            });

            return {
                externalStatus,
                internalStatus: 'unknown',
                statusCategory: 'pending',
                isTerminal: false,
                allowsReattempt: false,
                allowsCancellation: false
            };
        }

        return mapping;
    }

    /**
     * Helper: Check if shipment can be cancelled from current status
     */
    static canCancel(courier: string, status: string): boolean {
        try {
            return this.map(courier, status).allowsCancellation;
        } catch (error) {
            logger.warn('Error checking cancellation eligibility', { courier, status });
            return false;
        }
    }

    /**
     * Helper: Check if shipment can be reattempted from current status
     */
    static canReattempt(courier: string, status: string): boolean {
        try {
            return this.map(courier, status).allowsReattempt;
        } catch (error) {
            logger.warn('Error checking reattempt eligibility', { courier, status });
            return false;
        }
    }

    /**
     * Helper: Check if status is terminal (no further updates expected)
     */
    static isTerminal(courier: string, status: string): boolean {
        try {
            return this.map(courier, status).isTerminal;
        } catch (error) {
            logger.warn('Error checking terminal status', { courier, status });
            return false;
        }
    }

    /**
     * Get status category for business logic
     */
    static getCategory(courier: string, status: string): string {
        try {
            return this.map(courier, status).statusCategory;
        } catch (error) {
            logger.warn('Error getting status category', { courier, status });
            return 'pending';
        }
    }

    /**
     * Get all registered couriers
     */
    static getRegisteredCouriers(): string[] {
        return Array.from(this.registry.keys());
    }

    /**
     * Clear all registrations (useful for testing)
     */
    static clear(): void {
        this.registry.clear();
        this.caseSensitivity.clear();
        logger.info('Status mapper registry cleared');
    }
}
