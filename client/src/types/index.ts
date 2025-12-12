// Common API types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    message: string;
    code?: string;
    status?: number;
    details?: Record<string, any>;
}

// User types
export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
    role: 'user' | 'admin';
    company?: Company;
    createdAt: string;
    updatedAt: string;
}

export interface Company {
    id: string;
    name: string;
    gstin?: string;
    address?: Address;
    createdAt: string;
    updatedAt: string;
}

// Address types
export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    phone?: string;
}

// Shipment types
export interface Shipment {
    id: string;
    orderId: string;
    trackingNumber: string;
    carrier: CarrierInfo;
    status: ShipmentStatus;
    origin: Address;
    destination: Address;
    package: PackageInfo;
    pricing: PricingInfo;
    timeline: TimelineEvent[];
    createdAt: string;
    updatedAt: string;
}

export interface CarrierInfo {
    id: string;
    name: string;
    logo: string;
    trackingUrl?: string;
}

export type ShipmentStatus =
    | 'pending'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'returned'
    | 'failed';

export interface PackageInfo {
    weight: number; // in kg
    dimensions: {
        length: number; // in cm
        width: number;
        height: number;
    };
    description?: string;
    declaredValue?: number;
}

export interface PricingInfo {
    basePrice: number;
    taxes: number;
    discount: number;
    total: number;
    currency: string;
}

export interface TimelineEvent {
    id: string;
    status: ShipmentStatus;
    message: string;
    location?: string;
    timestamp: string;
}

// Order types
export interface Order {
    id: string;
    orderNumber: string;
    customer: Customer;
    items: OrderItem[];
    shipping: Address;
    billing: Address;
    total: number;
    status: OrderStatus;
    shipments?: Shipment[];
    createdAt: string;
    updatedAt: string;
}

export interface Customer {
    name: string;
    email: string;
    phone: string;
}

export interface OrderItem {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    total: number;
}

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';
