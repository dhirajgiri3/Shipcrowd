import { CourierStatusMapping } from '../../../../core/application/services/courier/status-mappings/status-mapper.service';

export const DELHIVERY_CONFIG = {
    // API Details
    api: {
        version: 'B2C',
        baseUrl: 'https://track.delhivery.com',
        authMethod: 'static_token',
    },

    // Service Configuration
    services: {
        types: ['Surface', 'Express', 'NDD'],
        default: 'Express',
        paymentModes: ['COD', 'Prepaid', 'Pickup', 'REPL'],
    },

    // Operational Capabilities
    capabilities: {
        mps: true,
        splitFlow: false,
        qcSupport: true, // RVP QC 3.0
        obd: false,
        ndr: 'full', // NDR + status
        manifest: 'missing', // Docs only, limited
        webhook: 'partial', // Status only
        pod: true,
        pickupScheduling: true,
        heavyShipment: true,
    },

    // Status Mappings (Complex mapping with Status Type + Status Code)
    statusMappings: [
        { externalStatus: 'UD|Manifested', internalStatus: 'created', statusCategory: 'pending', isTerminal: false, allowsReattempt: false, allowsCancellation: true },
        { externalStatus: 'UD|In Transit', internalStatus: 'in_transit', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: true },
        { externalStatus: 'UD|Pending', internalStatus: 'in_transit', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: true },
        { externalStatus: 'UD|Dispatched', internalStatus: 'dispatched', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: true },
        { externalStatus: 'PU|Picked Up', internalStatus: 'picked_up', statusCategory: 'in_transit', isTerminal: false, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'DL|Delivered', internalStatus: 'delivered', statusCategory: 'delivered', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'RT|RTO Initiated', internalStatus: 'rto_initiated', statusCategory: 'rto', isTerminal: false, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'RT|RTO Delivered', internalStatus: 'rto_delivered', statusCategory: 'rto', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
        { externalStatus: 'CN|Cancelled', internalStatus: 'cancelled', statusCategory: 'cancelled', isTerminal: true, allowsReattempt: false, allowsCancellation: false },
    ] as CourierStatusMapping[],

    // Non-Serviceable Location (NSL) Codes
    nslCodes: ['EOD-74', 'EOD-15', 'EOD-104', 'EOD-43', 'EOD-86', 'EOD-11', 'EOD-69', 'EOD-6'],

    // QC 3.0 Question Types
    qcQuestionTypes: [
        { type: 'image', label: 'QC Image' },
        { type: 'boolean', label: 'Product OK?' },
        { type: 'text', label: 'Remarks' },
    ],
};
