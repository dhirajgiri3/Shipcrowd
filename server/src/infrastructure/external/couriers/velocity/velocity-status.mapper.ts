/**
 * Velocity Status Mapper
 * 
 * Implements ICourierStatusMapper for Velocity courier provider
 * Handles Velocity-specific webhook payload structure and status codes
 */

import { ICourierStatusMapper } from "@/core/domain/courier/courier-status-mapper.interface";

export class VelocityStatusMapper implements ICourierStatusMapper {
    /**
     * Extract fields from Velocity webhook payload
     * 
     * Velocity Webhook Payload Structure:
     * {
     *   "awb": "12345",
     *   "status": "DELIVERED",
     *   "remark": "Delivered to neighbor",
     *   "location": "Bangalore"
     * }
     */
    extractFields(payload: any): {
        awb: string;
        status: string;
        location?: string;
        description?: string;
    } {
        return {
            awb: payload.awb,
            status: payload.status?.toUpperCase() || '',
            location: payload.location || '',
            description: payload.remark || payload.description || ''
        };
    }

    /**
     * Map Velocity status codes to internal ShipCrowd statuses
     * 
     * @param velocityStatus Status string from Velocity (e.g., "DELIVERED", "NDR", "RTO")
     * @returns Internal status ('delivered', 'in_transit', 'ndr', 'rto', 'cancelled', 'unknown')
     */
    mapStatus(velocityStatus: string): string {
        const upperStatus = velocityStatus?.toUpperCase() || '';

        // Delivered
        if (['DELIVERED', 'DL'].includes(upperStatus)) {
            return 'delivered';
        }

        // RTO (Return to Origin)
        if (['RTO', 'RTO INITIATED', 'RETURNED'].some(s => upperStatus.includes(s))) {
            return 'rto';
        }

        // Cancelled
        if (['CANCELLED', 'CN'].includes(upperStatus)) {
            return 'cancelled';
        }

        // In Transit / Out for Delivery
        if (['PICKED UP', 'PU', 'IN TRANSIT', 'IT', 'OUT FOR DELIVERY', 'OFD'].some(s => upperStatus.includes(s))) {
            return 'in_transit';
        }

        // NDR (Non-Delivery Report)
        if (['NDR', 'UNDELIVERED', 'UD'].some(s => upperStatus.includes(s))) {
            return 'ndr';
        }

        // Unknown/unmapped status
        return 'unknown';
    }

    /**
     * Get courier provider name
     */
    getCourierName(): string {
        return 'Velocity';
    }
}
