// Base Courier Adapter Interface
export interface CourierShipmentData {
    origin: {
        name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
    };
    destination: {
        name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
    };
    package: {
        weight: number;
        length: number;
        width: number;
        height: number;
        description?: string;
        declaredValue?: number;
    };
    orderNumber: string;
    paymentMode: 'prepaid' | 'cod';
    codAmount?: number;
    idempotencyKey?: string;
}

export interface CourierShipmentResponse {
    trackingNumber: string;
    labelUrl?: string;
    estimatedDelivery?: Date;
    cost?: number;
    providerShipmentId?: string; // Generic ID for provider's internal shipment record
}

export interface CourierTrackingResponse {
    trackingNumber: string;
    status: string;
    currentLocation?: string;
    timeline: Array<{
        status: string;
        message: string;
        location?: string;
        timestamp: Date;
    }>;
    estimatedDelivery?: Date;
}

export interface CourierRateRequest {
    origin: {
        pincode: string;
    };
    destination: {
        pincode: string;
    };
    package: {
        weight: number;
        length: number;
        width: number;
        height: number;
    };
    paymentMode: 'prepaid' | 'cod';
    shipmentType?: 'forward' | 'return';
}

export interface CourierRateResponse {
    basePrice: number;
    taxes: number;
    total: number;
    currency: string;
    serviceType?: string;
    estimatedDeliveryDays?: number;
}

export interface CourierReverseShipmentData {
    originalAwb?: string;
    orderId: string;
    pickupAddress: {
        name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
        email?: string;
    };
    returnWarehouseId: string;
    package: {
        weight: number;
        length: number;
        width: number;
        height: number;
    };
    reason?: string;
}

export interface CourierReverseShipmentResponse {
    trackingNumber: string;
    labelUrl?: string;
    orderId: string;
    courierName?: string;
}

/**
 * Base Courier Adapter Interface
 * All courier integrations should implement this interface
 */
export interface ICourierAdapter {
    /**
     * Create a shipment
     */
    createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse>;

    /**
     * Track a shipment
     */
    trackShipment(trackingNumber: string): Promise<CourierTrackingResponse>;

    /**
     * Get shipping rates
     */
    getRates(request: CourierRateRequest): Promise<CourierRateResponse[]>;

    /**
     * Cancel a shipment
     */
    cancelShipment(trackingNumber: string): Promise<boolean>;

    /**
     * Check service availability for a pincode
     * @param type 'delivery' (default) or 'pickup'
     */
    checkServiceability(pincode: string, type?: 'delivery' | 'pickup'): Promise<boolean>;
    createWarehouse?(data: any): Promise<any>;
    createReverseShipment(data: CourierReverseShipmentData): Promise<CourierReverseShipmentResponse>;
    cancelReverseShipment(reverseAwb: string, originalAwb: string, reason?: string): Promise<boolean>;

    /**
     * Schedule a pickup
     */
    schedulePickup?(data: any): Promise<any>;

    /**
     * Request reattempt for undelivered shipment
     */
    requestReattempt(trackingNumber: string, preferredDate?: Date, instructions?: string): Promise<{ success: boolean; message: string }>;
}

/**
 * Abstract Base Courier Adapter
 * Provides common functionality for all courier adapters
 */
export abstract class BaseCourierAdapter implements ICourierAdapter {
    constructor(
        protected readonly apiKey: string,
        protected readonly baseUrl: string
    ) { }

    abstract createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse>;
    abstract trackShipment(trackingNumber: string): Promise<CourierTrackingResponse>;
    abstract getRates(request: CourierRateRequest): Promise<CourierRateResponse[]>;
    abstract cancelShipment(trackingNumber: string): Promise<boolean>;
    abstract checkServiceability(pincode: string, type?: 'delivery' | 'pickup'): Promise<boolean>;
    abstract createReverseShipment(data: CourierReverseShipmentData): Promise<CourierReverseShipmentResponse>;
    abstract cancelReverseShipment(reverseAwb: string, originalAwb: string, reason?: string): Promise<boolean>;

    // Optional methods can have default implementation that throws NotSupported
    async createWarehouse(data: any): Promise<any> {
        throw new Error('Method not implemented.');
    }

    async requestReattempt(trackingNumber: string, preferredDate?: Date, instructions?: string): Promise<{ success: boolean; message: string }> {
        throw new Error('Method not implemented.');
    }

    /**
     * Common HTTP request method
     */
    protected async request<T>(
        endpoint: string,
        method: string = 'GET',
        body?: any,
        headers?: Record<string, string>
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const config: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(url, config);

        if (!response.ok) {
            throw new Error(`Courier API Error: ${response.statusText}`);
        }

        return response.json();
    }
}
