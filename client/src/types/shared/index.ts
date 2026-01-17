// Import OpenAPI schema components
import type { components } from '../../core/api/types/api';

// Re-export OpenAPI schema for direct access
export type { components, paths } from '../../core/api/types/api';

// Convenience type aliases from OpenAPI components
export type Order = components['schemas']['Order'];
export type Shipment = components['schemas']['Shipment'];
export type RateCard = components['schemas']['RateCard'];
export type Zone = components['schemas']['Zone'];
export type CarrierOption = components['schemas']['CarrierOption'];
export type Address = components['schemas']['Address'];
export type CustomerInfo = components['schemas']['CustomerInfo'];
export type Product = components['schemas']['Product'];

// Pagination type from OpenAPI
export type Pagination = components['schemas']['Pagination'];

// Error type from OpenAPI
export type ErrorResponse = components['schemas']['Error'];

// Custom UI-specific types (not in OpenAPI schema)
export interface ApiError {
    code: string;
    message: string;
    field?: string;
}

// User types (maintain for UI state management until auth is implemented)
export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
    role: 'admin' | 'seller' | 'staff';
    companyId?: string;
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
