/**
 * Ekart Logistics Status Mappings
 * 
 * Maps Ekart API statuses to internal normalized statuses.
 * Based on Ekart API documentation and observed tracking statuses.
 */

import { CourierMappingConfig } from "./status-mapper.service";

export const EKART_STATUS_MAPPINGS: CourierMappingConfig = {
    courier: 'ekart',
    caseSensitive: false,
    mappings: [
        // Initial/Pending States
        {
            externalStatus: 'Order Placed',
            internalStatus: 'manifested',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },

        // Pickup States
        {
            externalStatus: 'Picked Up',
            internalStatus: 'picked_up',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },

        // In Transit States
        {
            externalStatus: 'In Transit',
            internalStatus: 'in_transit',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Out for Delivery
        {
            externalStatus: 'Out for Delivery',
            internalStatus: 'out_for_delivery',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: true,
            allowsCancellation: false
        },

        // Delivery Failures (NDR)
        {
            externalStatus: 'Delivery Failed',
            internalStatus: 'delivery_failed',
            statusCategory: 'failed',
            isTerminal: false,
            allowsReattempt: true,
            allowsCancellation: false
        },

        // Successful Delivery
        {
            externalStatus: 'Delivered',
            internalStatus: 'delivered',
            statusCategory: 'delivered',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // RTO (Return to Origin) States
        {
            externalStatus: 'RTO Initiated',
            internalStatus: 'rto_initiated',
            statusCategory: 'rto',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'RTO Delivered',
            internalStatus: 'rto_delivered',
            statusCategory: 'rto',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Cancellation
        {
            externalStatus: 'Cancelled',
            internalStatus: 'cancelled',
            statusCategory: 'cancelled',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Lost/Damaged
        {
            externalStatus: 'Lost',
            internalStatus: 'lost',
            statusCategory: 'failed',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'Damaged',
            internalStatus: 'damaged',
            statusCategory: 'failed',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        }
    ]
};
