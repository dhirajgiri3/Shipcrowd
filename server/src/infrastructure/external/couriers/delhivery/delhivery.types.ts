/**
 * Delhivery B2C Types
 */

export type DelhiveryPaymentMode = 'Prepaid' | 'COD' | 'Pickup' | 'REPL';

// Status types: UD=Undelivered, DL=Delivered, RT=Return, CN=Cancelled, PP=Pickup Pending, PU=Pickup Complete
export type DelhiveryStatusType = 'UD' | 'DL' | 'RT' | 'CN' | 'PP' | 'PU';

export interface DelhiveryShipmentRequest {
    name: string;
    add: string;
    pin: string;
    city?: string;
    state?: string;
    country?: string;
    phone: string;
    order: string;
    payment_mode: DelhiveryPaymentMode;
    weight?: number; // grams
    shipping_mode?: 'Surface' | 'Express';
    cod_amount?: number;
    waybill?: string;
    return_name?: string;
    return_add?: string;
    return_pin?: string;
    return_city?: string;
    return_state?: string;
    return_country?: string;
    return_phone?: string;
    products_desc?: string;
    hsn_code?: string;
    seller_inv?: string;
    total_amount?: number;
    seller_name?: string;
    seller_add?: string;
    quantity?: string | number;
    address_type?: string;
    shipment_width?: number;
    shipment_height?: number;
    shipment_length?: number;
    ewbn?: string;
    transport_speed?: 'F' | 'D';

    // MPS fields
    shipment_type?: 'MPS';
    mps_amount?: number;
    mps_children?: number;
    master_id?: string;
}

export interface DelhiveryCreateShipmentPayload {
    client?: string;
    shipments: DelhiveryShipmentRequest[];
    pickup_location: {
        name: string;
    };
}

export interface DelhiveryTrackResponse {
    ShipmentData: Array<{
        Shipment: {
            Status: {
                Status: string;
                StatusDateTime: string;
                StatusType: DelhiveryStatusType;
                StatusLocation: string;
                Instructions: string;
            };
            PickUpDate?: string;
            NSLCode?: string;
            ReferenceNo?: string;
            AWB: string;
        };
    }>;
}

export interface DelhiveryServiceabilityResponse {
    delivery_codes: Array<{
        postal_code: {
            pin: number | string;
            city?: string;
            state_code?: string;
            pre_paid?: 'Y' | 'N';
            cod?: 'Y' | 'N';
            pickup?: 'Y' | 'N';
            repl?: 'Y' | 'N';
            remarks?: string;
        };
    }>;
}

export interface DelhiveryRatesResponse {
    chargeable_weight?: number;
    total_charge?: number;
    charges?: number;
    total_amount?: number;
    breakdown?: Record<string, number>;
    message?: string;
}

export interface DelhiveryPickupRequest {
    pickup_time: string; // HH:mm:ss
    pickup_date: string; // YYYY-MM-DD
    pickup_location: string;
    expected_package_count: number;
}

export interface DelhiveryWarehouseCreateRequest {
    name: string;
    registered_name?: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    pin: string;
    country?: string;
    return_address: string;
    return_city?: string;
    return_pin?: string;
    return_state?: string;
    return_country?: string;
}

export interface DelhiveryWarehouseUpdateRequest {
    name: string;
    address?: string;
    pin: string;
    phone?: string;
}

export interface DelhiveryWebhookPayload {
    Shipment: {
        Status: {
            Status: string;
            StatusDateTime: string;
            StatusType: DelhiveryStatusType;
            StatusLocation: string;
            Instructions: string;
        };
        PickUpDate?: string;
        NSLCode?: string;
        ReferenceNo?: string;
        AWB: string;
    };
}

export interface DelhiveryNdrActionRequest {
    data: Array<{
        waybill: string;
        act: 'RE-ATTEMPT' | 'PICKUP_RESCHEDULE';
    }>;
}

export interface DelhiveryNdrActionResponse {
    request_id?: string; // UPL ID
    status?: string;
    message?: string;
}

export interface DelhiveryNdrStatusResponse {
    status?: string;
    message?: string;
    results?: any;
}

export interface DelhiveryDocumentResponse {
    url?: string;
    message?: string;
}
