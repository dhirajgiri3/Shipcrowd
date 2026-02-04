/**
 * Velocity Shipfast Status Mappings
 * 
 * Maps Velocity API statuses to internal normalized statuses.
 * Based on observed statuses from Velocity tracking API responses.
 */

import { CourierMappingConfig } from "./status-mapper.service";

export const VELOCITY_STATUS_MAPPINGS: CourierMappingConfig = {
    courier: 'velocity',
    caseSensitive: false, // Velocity uses mixed case, normalize to lowercase
    mappings: [
        // Initial/Pending States
        {
            externalStatus: 'NEW',
            internalStatus: 'pending',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'PENDING',
            internalStatus: 'pending',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'MANIFESTED',
            internalStatus: 'manifested',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },

        // Pickup States
        {
            externalStatus: 'PICKUP SCHEDULED',
            internalStatus: 'pickup_scheduled',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'OUT FOR PICKUP',
            internalStatus: 'out_for_pickup',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'PICKED UP',
            internalStatus: 'picked_up',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'PICKUP FAILED',
            internalStatus: 'pickup_failed',
            statusCategory: 'failed',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },

        // In Transit States
        {
            externalStatus: 'IN TRANSIT',
            internalStatus: 'in_transit',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'REACHED HUB',
            internalStatus: 'in_transit',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'DISPATCHED',
            internalStatus: 'in_transit',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Out for Delivery
        {
            externalStatus: 'OUT FOR DELIVERY',
            internalStatus: 'out_for_delivery',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: true,
            allowsCancellation: false
        },

        // Delivery Attempts/Failures (NDR triggers)
        {
            externalStatus: 'DELIVERY ATTEMPTED',
            internalStatus: 'delivery_attempted',
            statusCategory: 'failed',
            isTerminal: false,
            allowsReattempt: true,
            allowsCancellation: false
        },
        {
            externalStatus: 'DELIVERY FAILED',
            internalStatus: 'delivery_failed',
            statusCategory: 'failed',
            isTerminal: false,
            allowsReattempt: true,
            allowsCancellation: false
        },
        {
            externalStatus: 'UNDELIVERED',
            internalStatus: 'undelivered',
            statusCategory: 'failed',
            isTerminal: false,
            allowsReattempt: true,
            allowsCancellation: false
        },

        // Successful Delivery
        {
            externalStatus: 'DELIVERED',
            internalStatus: 'delivered',
            statusCategory: 'delivered',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // RTO (Return to Origin) States
        {
            externalStatus: 'RTO INITIATED',
            internalStatus: 'rto_initiated',
            statusCategory: 'rto',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'RTO IN TRANSIT',
            internalStatus: 'rto_in_transit',
            statusCategory: 'rto',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'RTO OUT FOR DELIVERY',
            internalStatus: 'rto_out_for_delivery',
            statusCategory: 'rto',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'RTO DELIVERED',
            internalStatus: 'rto_delivered',
            statusCategory: 'rto',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Cancellation States
        {
            externalStatus: 'CANCELLED',
            internalStatus: 'cancelled',
            statusCategory: 'cancelled',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'CANCELLATION REQUESTED',
            internalStatus: 'cancellation_requested',
            statusCategory: 'cancelled',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Lost/Damaged
        {
            externalStatus: 'LOST',
            internalStatus: 'lost',
            statusCategory: 'failed',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'DAMAGED',
            internalStatus: 'damaged',
            statusCategory: 'failed',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Reverse Pickup States
        {
            externalStatus: 'RETURN PICKUP SCHEDULED',
            internalStatus: 'return_pickup_scheduled',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'RETURN PICKED UP',
            internalStatus: 'return_picked_up',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'RETURN IN TRANSIT',
            internalStatus: 'return_in_transit',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'RETURN DELIVERED',
            internalStatus: 'return_delivered',
            statusCategory: 'delivered',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        }
    ]
};
