/**
 * Velocity Shipfast API Mock
 * Mocks for the courier integration API
 */

export interface VelocityShipfastOrder {
    orderNumber: string;
    awbNumber: string;
    status: string;
    trackingUrl: string;
    estimatedDelivery: string;
    labelUrl?: string;
}

export interface VelocityTrackingEvent {
    status: string;
    timestamp: string;
    location: string;
    description: string;
}

/**
 * Mock successful order creation response
 */
export const mockCreateOrderSuccess = (orderNumber: string): VelocityShipfastOrder => ({
    orderNumber,
    awbNumber: `VS${Date.now()}${Math.random().toString(36).substring(2, 8)}`.toUpperCase(),
    status: 'CREATED',
    trackingUrl: `https://track.velocityshipfast.com/AWB123`,
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    labelUrl: `https://labels.velocityshipfast.com/AWB123.pdf`,
});

/**
 * Mock order creation failure
 */
export const mockCreateOrderFailure = (message: string = 'Invalid address') => ({
    success: false,
    error: {
        code: 'INVALID_REQUEST',
        message,
    },
});

/**
 * Mock tracking response
 */
export const mockTrackingResponse = (
    awbNumber: string,
    status: string = 'IN_TRANSIT'
): { awbNumber: string; currentStatus: string; events: VelocityTrackingEvent[] } => ({
    awbNumber,
    currentStatus: status,
    events: [
        {
            status: 'CREATED',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Mumbai Hub',
            description: 'Shipment created',
        },
        {
            status: 'PICKED_UP',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Mumbai Hub',
            description: 'Package picked up from seller',
        },
        {
            status: 'IN_TRANSIT',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Delhi Hub',
            description: 'Package in transit to destination',
        },
    ],
});

/**
 * Mock cancellation response
 */
export const mockCancellationSuccess = (awbNumber: string) => ({
    success: true,
    awbNumber,
    status: 'CANCELLED',
    message: 'Order cancelled successfully',
});

/**
 * Mock cancellation failure
 */
export const mockCancellationFailure = (awbNumber: string) => ({
    success: false,
    awbNumber,
    error: {
        code: 'CANNOT_CANCEL',
        message: 'Order already in transit, cannot cancel',
    },
});

/**
 * Mock rate estimation response
 */
export const mockRateEstimation = (
    _originPincode: string,
    _destPincode: string,
    weight: number
) => ({
    success: true,
    rates: [
        {
            serviceType: 'EXPRESS',
            carrierId: 'CARFRQQXRTZQ9', // Delhivery Express
            estimatedDays: 2,
            baseRate: 80,
            weightCharge: weight * 20,
            totalRate: 80 + weight * 20,
            currency: 'INR',
        },
        {
            serviceType: 'STANDARD',
            carrierId: 'CAR2CHKPXAC5T', // Delhivery Standard
            estimatedDays: 5,
            baseRate: 50,
            weightCharge: weight * 15,
            totalRate: 50 + weight * 15,
            currency: 'INR',
        },
    ],
});

/**
 * Mock label generation response
 */
export const mockLabelGeneration = (awbNumber: string) => ({
    success: true,
    awbNumber,
    labelUrl: `https://labels.velocityshipfast.com/${awbNumber}.pdf`,
    format: 'PDF',
    dimensions: '4x6 inches',
});

/**
 * Create a mock Velocity Shipfast client for testing
 */
export const createVelocityMockClient = () => ({
    createOrder: jest.fn().mockImplementation((orderData) =>
        Promise.resolve(mockCreateOrderSuccess(orderData.orderNumber))
    ),
    getTracking: jest.fn().mockImplementation((awbNumber) =>
        Promise.resolve(mockTrackingResponse(awbNumber))
    ),
    cancelOrder: jest.fn().mockImplementation((awbNumber) =>
        Promise.resolve(mockCancellationSuccess(awbNumber))
    ),
    getRates: jest.fn().mockImplementation((origin, dest, weight) =>
        Promise.resolve(mockRateEstimation(origin, dest, weight))
    ),
    generateLabel: jest.fn().mockImplementation((awbNumber) =>
        Promise.resolve(mockLabelGeneration(awbNumber))
    ),
});

/**
 * Reset all mocks
 */
export const resetVelocityMocks = (client: ReturnType<typeof createVelocityMockClient>) => {
    Object.values(client).forEach((mock) => {
        if (typeof mock.mockClear === 'function') {
            mock.mockClear();
        }
    });
};
