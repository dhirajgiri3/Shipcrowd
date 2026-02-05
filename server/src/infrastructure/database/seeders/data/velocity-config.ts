import { CourierStatusMapping } from '../../../../core/application/services/courier/status-mappings/status-mapper.service';

export const VELOCITY_CONFIG = {
    // API Details
    api: {
        version: 'v1',
        baseUrl: 'https://shazam.velocity.in',
        authMethod: 'token',
        tokenExpiry: 24, // hours
    },

    // Service Configuration
    services: {
        types: ['Standard', 'Express', 'Surface', 'Same Day'],
        default: 'Standard',
        paymentModes: ['COD', 'Prepaid'],
    },

    // Operational Capabilities
    capabilities: {
        mps: false,
        splitFlow: true, // Order + Shipment
        qcSupport: true,
        obd: false,
        ndr: 'weak', // Reattempt only
        manifest: 'auto', // Auto-generated URL
        webhook: 'partial', // No signature verif (upgraded to full with service impl)
        pod: false,
        pickupScheduling: true,
    },

    // Status Mappings
    statusMappings: [
        { externalStatus: 'NEW', internalStatus: 'created', statusCategory: 'pending', isTerminal: false, allowsReattempt: false, allowsCancellation: true },
        { externalStatus: 'PKP', internalStatus: 'picked_up', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: true },
        { externalStatus: 'IT', internalStatus: 'in_transit', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: true },
        { externalStatus: 'OFD', internalStatus: 'out_for_delivery', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'DEL', internalStatus: 'delivered', statusCategory: 'delivered', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'NDR', internalStatus: 'undelivered', statusCategory: 'failed', isTerminal: false, allowsReattempt: true, allowsCancellation: false },
        { externalStatus: 'RTO', internalStatus: 'rto_initiated', statusCategory: 'rto', isTerminal: false, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'LOST', internalStatus: 'lost', statusCategory: 'failed', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'DAMAGED', internalStatus: 'damaged', statusCategory: 'failed', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'CANCELLED', internalStatus: 'cancelled', statusCategory: 'cancelled', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
    ] as CourierStatusMapping[],

    // Zone Definitions
    zones: [
        { code: 'zone_a', description: 'Intra-city' },
        { code: 'zone_b', description: 'Intra-state' },
        { code: 'zone_c', description: 'Metro to Metro' },
        { code: 'zone_d', description: 'Rest of India' },
        { code: 'zone_e', description: 'North East / J&K' },
    ],
};
