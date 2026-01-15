/**
 * Address & Serviceability Types
 * 
 * Type definitions for address validation, pincode serviceability,
 * and courier coverage features.
 */

// ==================== Courier Coverage Types ====================

export type CourierName =
    | 'velocity'
    | 'delhivery'
    | 'ekart'
    | 'xpressbees'
    | 'bluedart'
    | 'shadowfax'
    | 'ecom_express';

export type ZoneType = 'A' | 'B' | 'C' | 'D' | 'E' | 'LOCAL' | 'METRO' | 'REST_OF_INDIA';

export interface CourierCoverage {
    courier: CourierName;
    courierDisplayName: string;
    serviceable: boolean;
    codAvailable: boolean;
    prepaidAvailable: boolean;
    estimatedDays: number;
    estimatedDaysMin?: number;
    estimatedDaysMax?: number;
    zone: ZoneType;
    surfaceAvailable: boolean;
    expressAvailable: boolean;
    pickupAvailable: boolean;
    reversePickupAvailable: boolean;
    sundayDelivery: boolean;
    codLimit?: number;
    weightLimit?: number;
}

// ==================== Pincode Types ====================

export interface PincodeInfo {
    pincode: string;
    city: string;
    state: string;
    district: string;
    region: string;
    country: string;
    isMetro: boolean;
    latitude?: number;
    longitude?: number;
}

export interface PincodeServiceability {
    pincode: string;
    pincodeInfo: PincodeInfo;
    isServiceable: boolean;
    serviceableCouriers: CourierCoverage[];
    nonServiceableCouriers: string[];
    lastUpdated: string;
}

// ==================== Address Types ====================

export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    landmark?: string;
    contactName?: string;
    contactPhone?: string;
    isVerified?: boolean;
}

export interface AddressValidationResult {
    isValid: boolean;
    originalAddress: Address;
    suggestedAddress?: Address;
    errors: AddressValidationError[];
    warnings: string[];
    pincodeServiceability?: PincodeServiceability;
}

export interface AddressValidationError {
    field: keyof Address;
    message: string;
    code: string;
}

// ==================== Bulk Validation Types ====================

export interface BulkAddressValidationRequest {
    addresses: Address[];
}

export interface BulkAddressValidationResult {
    totalAddresses: number;
    validAddresses: number;
    invalidAddresses: number;
    results: AddressValidationResult[];
    processedAt: string;
}

// ==================== API Response Types ====================

export interface ServiceabilityCheckRequest {
    originPincode: string;
    destinationPincode: string;
    paymentMode?: 'COD' | 'PREPAID';
    weight?: number;
    courierPreference?: CourierName[];
}

export interface ServiceabilityCheckResponse {
    origin: PincodeInfo;
    destination: PincodeInfo;
    availableCouriers: CourierCoverage[];
    cheapestOption?: {
        courier: CourierName;
        estimatedCost: number;
        estimatedDays: number;
    };
    fastestOption?: {
        courier: CourierName;
        estimatedCost: number;
        estimatedDays: number;
    };
}

// ==================== Filter Types ====================

export interface ServiceabilityFilters {
    paymentMode?: 'COD' | 'PREPAID' | 'ALL';
    weight?: number;
    includeNonServiceable?: boolean;
    courierFilter?: CourierName[];
}

// ==================== Component Prop Types ====================

export interface PincodeCheckerProps {
    onServiceabilityResult?: (result: PincodeServiceability) => void;
    onError?: (error: string) => void;
    showCourierDetails?: boolean;
    compact?: boolean;
}

export interface AddressValidationProps {
    initialAddress?: Partial<Address>;
    onValidAddress?: (address: Address, serviceability: PincodeServiceability) => void;
    onValidationError?: (errors: AddressValidationError[]) => void;
    showServiceability?: boolean;
    required?: boolean;
}

export interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onAddressSelect: (address: Address) => void;
    placeholder?: string;
    disabled?: boolean;
}
