import { CourierStatusMapping } from '../../../../core/application/services/courier/status-mappings/status-mapper.service';

export const EKART_CONFIG = {
    // API Details
    api: {
        version: 'v3.8.8',
        baseUrl: 'https://app.elite.ekartlogistics.in',
        authMethod: 'client_id_token',
        tokenExpiry: 24, // hours
    },

    // Service Configuration
    services: {
        types: ['Surface', 'Express'],
        default: 'Surface',
        paymentModes: ['COD', 'Prepaid', 'Pickup'],
    },

    // Operational Capabilities
    capabilities: {
        mps: true,
        splitFlow: false,
        qcSupport: true,
        obd: true,
        ndr: 'full', // Reattempt + RTO
        manifest: 'api',
        webhook: 'full', // HMAC SHA256
        pod: false,
        pickupScheduling: false,
    },

    // Status Mappings
    statusMappings: [
        { externalStatus: 'pickup_complete', internalStatus: 'picked_up', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'in_transit', internalStatus: 'in_transit', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'out_for_delivery', internalStatus: 'out_for_delivery', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'delivered', internalStatus: 'delivered', statusCategory: 'delivered', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'undelivered', internalStatus: 'undelivered', statusCategory: 'failed', isTerminal: false, allowsReattempt: true, allowsCancellation: true },
        { externalStatus: 'rto_initiated', internalStatus: 'rto_initiated', statusCategory: 'rto', isTerminal: false, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'rto_delivered', internalStatus: 'rto_delivered', statusCategory: 'rto', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'cancelled', internalStatus: 'cancelled', statusCategory: 'cancelled', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'lost', internalStatus: 'lost', statusCategory: 'failed', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'damaged', internalStatus: 'damaged', statusCategory: 'failed', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
    ] as CourierStatusMapping[],

    // Packaging Guidelines (Ekart Specific)
    packagingTemplates: [
        { name: 'Standard Box', length: 10, breadth: 10, height: 10 },
        { name: 'Large Box', length: 20, breadth: 20, height: 20 },
        { name: 'Flyer', length: 15, breadth: 12, height: 1 },
    ],

    // QC Parameters for Reverse Shipments
    qcParameters: [
        { parameter: 'product_mismatch', label: 'Product Mismatch', type: 'boolean' },
        { parameter: 'quantity_mismatch', label: 'Quantity Mismatch', type: 'boolean' },
        { parameter: 'damage', label: 'Physical Damage', type: 'boolean' },
        { parameter: 'accessories_missing', label: 'Accessories Missing', type: 'boolean' },
    ]
};
