// Courier Management Types

export interface Courier {
    _id: string;
    name: string;
    code: string;
    apiEndpoint: string;
    apiKey?: string; // Masked in responses
    isActive: boolean;
    credentialsConfigured?: boolean;
    operationalStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
    activeShipments: number;
    slaCompliance: {
        today: number | null;
        week: number | null;
        month: number | null;
    };
    services: CourierService[];
    createdAt: string;
    updatedAt: string;
}

export interface CourierService {
    _id: string;
    name: string;
    code: string;
    type: 'EXPRESS' | 'STANDARD' | 'ECONOMY';
    isActive: boolean;
}

export interface CourierPerformance {
    successRate: number;
    avgDeliveryTime: number; // in hours
    rtoPercentage: number;
    ndrPercentage: number;
    costPerShipment: number;
    totalShipments: number;
    deliveredShipments: number;
    zonePerformance: ZonePerformance[];
    timeSeriesData: PerformanceDataPoint[];
    ranking: number; // Ranking among all couriers
    totalCouriers: number; // For ranking context
}

export interface ZonePerformance {
    zone: string;
    successRate: number;
    avgDeliveryTime: number;
    totalShipments: number;
    deliveredShipments: number;
}

export interface PerformanceDataPoint {
    date: string;
    successRate: number;
    shipments: number;
    avgDeliveryTime: number;
}

export interface UpdateCourierRequest {
    name?: string;
    apiEndpoint?: string;
    apiKey?: string;
    isActive?: boolean;
    credentials?: {
        apiKey?: string;
        clientId?: string;
        username?: string;
        password?: string;
    };
}

export interface PerformanceFilters {
    startDate?: string;
    endDate?: string;
    zone?: string;
    serviceType?: 'EXPRESS' | 'STANDARD' | 'ECONOMY';
}

export interface CourierDetailResponse {
    success: boolean;
    data: Courier;
}

export interface CourierPerformanceResponse {
    success: boolean;
    data: CourierPerformance;
}
