// Base Courier Adapter Interface
import { CourierFeatureNotSupportedError } from '../../../../shared/errors/app.error';
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

export interface CourierPODResponse {
    url?: string;
    fileBuffer?: Buffer;
    mimeType?: string;
    source?: 'courier_api' | 'manual' | 'not_supported';
    message?: string;
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
    orderValue?: number;  // For COD charge calculation
    shipmentType?: 'forward' | 'return';
}

export interface CourierRateResponse {
    basePrice: number;
    taxes: number;
    total: number;
    currency: string;
    serviceType?: string;
    carrierId?: string;      // NEW: For split flow carrier selection
    estimatedDeliveryDays?: number;
    zone?: string;           // NEW: From serviceability
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
     * Schedule a reverse pickup (RTO) if supported
     */
    scheduleReversePickup?(data: {
        reverseAwb?: string;
        originalAwb?: string;
        pickupDate?: Date;
        timeSlot?: string;
        pickupAddress?: {
            address: string;
            pincode: string;
            phone: string;
        };
    }): Promise<{ success: boolean; message?: string; pickupId?: string }>;

    /**
     * Request reattempt for undelivered shipment
     */
    requestReattempt(trackingNumber: string, preferredDate?: Date, instructions?: string): Promise<{ success: boolean; message: string }>;

    /**
     * Update delivery address (if courier supports it)
     */
    updateDeliveryAddress?(
        awb: string,
        newAddress: {
            line1: string;
            city: string;
            state: string;
            pincode: string;
            country: string;
        },
        orderId: string,
        phone?: string
    ): Promise<{ success: boolean; message: string }>;

    // Split Flow Methods (optional - not all couriers support)
    createOrderOnly?(data: CourierShipmentData): Promise<{
        orderId: string;
        shipmentId: string;
        success: boolean;
    }>;

    assignCourierToOrder?(
        shipmentId: string,
        carrierId?: string
    ): Promise<CourierShipmentResponse>;

    createReverseOrderOnly?(data: CourierReverseShipmentData): Promise<{
        orderId: string;
        returnId: string;
        success: boolean;
    }>;

    assignCourierToReverseOrder?(
        returnId: string,
        warehouseId: string,
        carrierId?: string
    ): Promise<CourierReverseShipmentResponse>;

    // Reports (optional)
    getSummaryReport?(
        startDate: Date,
        endDate: Date,
        type: 'forward' | 'return'
    ): Promise<any>;

    /**
     * Manifest creation (optional)
     */
    createManifest?(data: {
        shipmentIds?: string[];
        awbs?: string[];
        warehouseId?: string;
    }): Promise<{ manifestId?: string; manifestUrl?: string } | null>;

    /**
     * Proof of Delivery (POD) retrieval (optional)
     */
    getProofOfDelivery?(trackingNumber: string): Promise<CourierPODResponse>;
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
        throw new CourierFeatureNotSupportedError(
            this.constructor.name,
            'createWarehouse'
        );
    }

    async requestReattempt(trackingNumber: string, preferredDate?: Date, instructions?: string): Promise<{ success: boolean; message: string }> {
        throw new CourierFeatureNotSupportedError(
            this.constructor.name,
            'requestReattempt'
        );
    }

    async updateDeliveryAddress(
        awb: string,
        newAddress: {
            line1: string;
            city: string;
            state: string;
            pincode: string;
            country: string;
        },
        orderId: string,
        phone?: string
    ): Promise<{ success: boolean; message: string }> {
        throw new CourierFeatureNotSupportedError(
            this.constructor.name,
            'updateDeliveryAddress'
        );
    }

    async getProofOfDelivery(trackingNumber: string): Promise<CourierPODResponse> {
        throw new CourierFeatureNotSupportedError(
            this.constructor.name,
            'getProofOfDelivery'
        );
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
