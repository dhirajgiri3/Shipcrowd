import { CourierMappingConfig } from './status-mapper.service';

const NDR_NSL_CODES = ['EOD-74', 'EOD-15', 'EOD-104', 'EOD-43', 'EOD-86', 'EOD-11', 'EOD-69', 'EOD-6'];

export const DELHIVERY_STATUS_MAPPINGS: CourierMappingConfig = {
    courier: 'delhivery',
    caseSensitive: false,
    mappings: [
        // Forward (UD)
        {
            externalStatus: 'UD|MANIFESTED',
            internalStatus: 'manifested',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'UD|NOT PICKED',
            internalStatus: 'pickup_pending',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'UD|IN TRANSIT',
            internalStatus: 'in_transit',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'UD|PENDING',
            internalStatus: 'pending',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'UD|DISPATCHED',
            internalStatus: 'out_for_delivery',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: true,
            allowsCancellation: false
        },

        // Delivered
        {
            externalStatus: 'DL|DELIVERED',
            internalStatus: 'delivered',
            statusCategory: 'delivered',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Return (RT / RTO)
        {
            externalStatus: 'RT|IN TRANSIT',
            internalStatus: 'rto_in_transit',
            statusCategory: 'rto',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'RT|PENDING',
            internalStatus: 'rto_pending',
            statusCategory: 'rto',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'RT|DISPATCHED',
            internalStatus: 'rto_out_for_delivery',
            statusCategory: 'rto',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'DL|RTO',
            internalStatus: 'rto_delivered',
            statusCategory: 'rto',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Reverse Pickup (PP/PU)
        {
            externalStatus: 'PP|OPEN',
            internalStatus: 'pickup_pending',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'PP|SCHEDULED',
            internalStatus: 'pickup_scheduled',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: true
        },
        {
            externalStatus: 'PP|DISPATCHED',
            internalStatus: 'out_for_pickup',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'PU|IN TRANSIT',
            internalStatus: 'return_in_transit',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'PU|PENDING',
            internalStatus: 'return_pending',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'PU|DISPATCHED',
            internalStatus: 'return_out_for_delivery',
            statusCategory: 'in_transit',
            isTerminal: false,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'DL|DTO',
            internalStatus: 'delivered',
            statusCategory: 'delivered',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },

        // Cancellation
        {
            externalStatus: 'CN|CANCELED',
            internalStatus: 'cancelled',
            statusCategory: 'cancelled',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        },
        {
            externalStatus: 'CN|CANCELLED',
            internalStatus: 'cancelled',
            statusCategory: 'cancelled',
            isTerminal: true,
            allowsReattempt: false,
            allowsCancellation: false
        }
    ]
};

// Add NDR mappings based on NSL codes
NDR_NSL_CODES.forEach((code) => {
    DELHIVERY_STATUS_MAPPINGS.mappings.push({
        externalStatus: `UD|IN TRANSIT|${code}`,
        internalStatus: 'ndr',
        statusCategory: 'failed',
        isTerminal: false,
        allowsReattempt: true,
        allowsCancellation: false
    });
    DELHIVERY_STATUS_MAPPINGS.mappings.push({
        externalStatus: `UD|PENDING|${code}`,
        internalStatus: 'ndr',
        statusCategory: 'failed',
        isTerminal: false,
        allowsReattempt: true,
        allowsCancellation: false
    });
    DELHIVERY_STATUS_MAPPINGS.mappings.push({
        externalStatus: `UD|DISPATCHED|${code}`,
        internalStatus: 'ndr',
        statusCategory: 'failed',
        isTerminal: false,
        allowsReattempt: true,
        allowsCancellation: false
    });
});
