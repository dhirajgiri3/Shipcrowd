/**
 * Shipment API Layer
 * Handles shipment-specific operations like tracking and label generation
 */

import { apiClient } from '@/src/core/api/http';

export interface ShipmentDetails {
    shipmentId: string;
    awbNumber: string;
    orderId: string;
    courier: string;
    service: string;
    weight: string;
    dimensions: string;
    paymentMode: 'COD' | 'Prepaid';
    codAmount: number;
    createdAt: string;
    shipperDetails: {
        name: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
    };
    consigneeDetails: {
        name: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
    };
    productDetails: {
        name: string;
        sku: string;
        quantity: number;
    };
}

interface ShipmentListApiRecord {
    _id: string;
    trackingNumber?: string;
    carrier?: string;
    serviceType?: string;
    createdAt?: string;
    carrierDetails?: {
        carrierTrackingNumber?: string;
    };
    packageDetails?: {
        weight?: number;
        dimensions?: { length?: number; width?: number; height?: number };
    };
    paymentDetails?: {
        type?: string;
        codAmount?: number;
    };
    pickupDetails?: {
        contactPhone?: string;
        warehouseId?: {
            name?: string;
            address?: {
                line1?: string;
                line2?: string;
                city?: string;
                state?: string;
                postalCode?: string;
            };
            contactInfo?: { phone?: string };
        };
    };
    deliveryDetails?: {
        recipientName?: string;
        recipientPhone?: string;
        address?: {
            line1?: string;
            line2?: string;
            city?: string;
            state?: string;
            postalCode?: string;
        };
    };
    orderId?: {
        _id?: string;
        orderNumber?: string;
        paymentMethod?: string;
        products?: Array<{ name?: string; sku?: string; quantity?: number }>;
    } | string;
}

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const mapShipmentToLabelDetails = (shipment: ShipmentListApiRecord): ShipmentDetails => {
    const order = typeof shipment.orderId === 'object' && shipment.orderId ? shipment.orderId : undefined;
    const warehouse = shipment.pickupDetails?.warehouseId;
    const dimensions = shipment.packageDetails?.dimensions || {};
    const firstProduct = order?.products?.[0];

    return {
        shipmentId: shipment._id,
        awbNumber: shipment.carrierDetails?.carrierTrackingNumber || shipment.trackingNumber || '',
        orderId: order?.orderNumber || String(order?._id || ''),
        courier: String(shipment.carrier || '').toUpperCase(),
        service: shipment.serviceType || 'standard',
        weight: `${Number(shipment.packageDetails?.weight || 0)} kg`,
        dimensions: `${Number(dimensions.length || 0)}x${Number(dimensions.width || 0)}x${Number(dimensions.height || 0)} cm`,
        paymentMode: normalize(shipment.paymentDetails?.type || order?.paymentMethod) === 'cod' ? 'COD' : 'Prepaid',
        codAmount: Number(shipment.paymentDetails?.codAmount || 0),
        createdAt: shipment.createdAt || new Date().toISOString(),
        shipperDetails: {
            name: warehouse?.name || 'Seller',
            address: [warehouse?.address?.line1, warehouse?.address?.line2].filter(Boolean).join(', '),
            city: warehouse?.address?.city || '',
            state: warehouse?.address?.state || '',
            pincode: warehouse?.address?.postalCode || '',
            phone: shipment.pickupDetails?.contactPhone || warehouse?.contactInfo?.phone || '',
        },
        consigneeDetails: {
            name: shipment.deliveryDetails?.recipientName || 'N/A',
            address: [shipment.deliveryDetails?.address?.line1, shipment.deliveryDetails?.address?.line2].filter(Boolean).join(', '),
            city: shipment.deliveryDetails?.address?.city || '',
            state: shipment.deliveryDetails?.address?.state || '',
            pincode: shipment.deliveryDetails?.address?.postalCode || '',
            phone: shipment.deliveryDetails?.recipientPhone || '',
        },
        productDetails: {
            name: firstProduct?.name || 'Shipment Item',
            sku: firstProduct?.sku || 'N/A',
            quantity: Number(firstProduct?.quantity || 1),
        },
    };
};

export interface TrackingActivity {
    date: string;
    status: string;
    activity: string;
    location: string;
    'sr-status': string;
    'sr-status-label': string;
}

export interface TrackingInfo {
    track_status: number;
    shipment_status: number;
    shipment_track: Array<{
        id: number;
        awb_code: string;
        courier_shipment_id: string;
        shipment_id: number;
        status: string;
        added_on: string;
        delivered_date: string;
        expected_date: string;
        current_status: string;
        courier_name: string;
        order_id: string;
        qc_status?: string; // Added to handle qc_response if needed
    }>;
    shipment_track_activities: Array<TrackingActivity>;
    track_url: string;
    qc_response?: any;
}

export interface NormalizedTrackingEvent {
    status: string;
    location: string;
    timestamp: string;
    completed: boolean;
    current: boolean;
    description?: string;
}

export interface RecipientInfo {
    name?: string;
    city: string;
    state: string;
}

export interface NormalizedTrackingData {
    awb: string;
    trackingNumber: string;
    currentStatus: string;
    status: string; // Keep for backward compatibility if needed, mirror currentStatus
    createdAt?: string;
    estimatedDelivery: string;
    actualDelivery?: string;
    origin: string;
    destination: string;
    recipient: RecipientInfo;
    carrier: string;
    courier: string; // Alias for backward compatibility
    serviceType: string;
    timeline: NormalizedTrackingEvent[];
    history: NormalizedTrackingEvent[]; // Alias for backward compatibility
}



export const shipmentApi = {
    /**
     * Get shipment details by AWB
     */
    getShipmentByAwb: async (awb: string): Promise<ShipmentDetails> => {
        const response = await apiClient.get<{ success: boolean; data: ShipmentListApiRecord[] }>(
            '/shipments',
            { params: { search: awb, page: 1, limit: 10 } }
        );
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        const target = normalize(awb);
        const matched = rows.find((shipment) => {
            const internal = normalize(shipment.trackingNumber);
            const carrierAwb = normalize(shipment.carrierDetails?.carrierTrackingNumber);
            return internal === target || carrierAwb === target;
        });

        if (!matched) {
            throw new Error('Shipment not found');
        }

        return mapShipmentToLabelDetails(matched);
    },

    /**
     * Generate label for a shipment
     * Returns: Label HTML content or URL
     */
    generateLabel: async (shipmentId: string): Promise<{ labelUrl: string; htmlContent?: string }> => {
        const response = await apiClient.get(
            `/shipments/${encodeURIComponent(shipmentId)}/label/download`,
            {
                params: { format: 'pdf' },
                responseType: 'blob',
            }
        );
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const labelUrl = window.URL.createObjectURL(blob);
        return { labelUrl };
    },

    /**
     * Get tracking information by AWB or Order ID
     */
    trackShipment: async (awb: string): Promise<NormalizedTrackingData> => {
        // Backend route: /api/v1/shipments/public/track/{awb}
        const response = await apiClient.get<any>(`/shipments/public/track/${awb}`);

        const data = response.data?.data || response.data;

        // Backend now returns properly formatted timeline
        const timeline = data.timeline || [];

        // Format estimated delivery date if it's an ISO string
        let estimatedDelivery = 'N/A';
        if (data.estimatedDelivery) {
            try {
                const date = new Date(data.estimatedDelivery);
                estimatedDelivery = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            } catch (e) {
                estimatedDelivery = data.estimatedDelivery;
            }
        }

        return {
            awb: data.awb || data.trackingNumber || awb,
            trackingNumber: data.trackingNumber || awb,
            currentStatus: data.currentStatus || 'Unknown',
            status: data.currentStatus || 'Unknown',
            createdAt: data.createdAt,
            estimatedDelivery,
            actualDelivery: data.actualDelivery,
            origin: data.origin || 'N/A',
            destination: data.destination || 'N/A',
            recipient: data.recipient || {
                city: 'N/A',
                state: 'N/A'
            },
            carrier: data.carrier || 'N/A',
            courier: data.carrier || 'N/A',
            serviceType: data.serviceType || 'Standard',
            timeline,
            history: timeline
        };
    },

    // Alias for backward compatibility if used elsewhere
    getTrackingInfo: async (awb: string): Promise<NormalizedTrackingData> => {
        return shipmentApi.trackShipment(awb);
    }
};
