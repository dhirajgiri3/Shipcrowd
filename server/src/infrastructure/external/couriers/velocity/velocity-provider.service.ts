import axios from 'axios';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Velocity Courier Provider Service
 * Official API integration for shipment creation, tracking, cancellation
 * 
 * API Docs: https://velocitycourier.com/api-docs
 * 
 * Endpoints implemented:
 * 1. Create Shipment - POST /api/v2/shipments
 * 2. Track Shipment - GET /api/v2/shipments/{awb}/track
 * 3. Cancel Shipment - POST /api/v2/shipments/{awb}/cancel
 * 4. Get Rate - POST /api/v2/rates/calculate
 */

interface VelocityShipmentRequest {
    pickup: {
        name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
    };
    delivery: {
        name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
    };
    shipment: {
        weight: number;  // in kg
        length: number;  // in cm
        width: number;
        height: number;
        packageCount: number;
        invoiceValue: number;
        paymentMode: 'cod' | 'prepaid';
        codAmount?: number;
    };
    orderNumber: string;
}

interface VelocityShipmentResponse {
    success: boolean;
    awb: string;
    carrierTrackingNumber: string;
    labelUrl: string;
    estimatedDelivery: string;
}

class VelocityProviderService {
    private apiKey: string;
    private baseURL: string;

    constructor() {
        this.apiKey = process.env.VELOCITY_API_KEY || '';
        this.baseURL = process.env.VELOCITY_BASE_URL || 'https://api.velocitycourier.com';
    }

    /**
     * Create shipment with Velocity
     */
    async createShipment(data: VelocityShipmentRequest): Promise<VelocityShipmentResponse> {
        try {
            const response = await axios.post(
                `${this.baseURL}/api/v2/shipments`,
                {
                    pickup_details: {
                        name: data.pickup.name,
                        phone: data.pickup.phone,
                        address: data.pickup.address,
                        city: data.pickup.city,
                        state: data.pickup.state,
                        pincode: data.pickup.pincode,
                    },
                    delivery_details: {
                        name: data.delivery.name,
                        phone: data.delivery.phone,
                        address: data.delivery.address,
                        city: data.delivery.city,
                        state: data.delivery.state,
                        pincode: data.delivery.pincode,
                    },
                    shipment_details: {
                        weight: data.shipment.weight,
                        dimensions: {
                            length: data.shipment.length,
                            width: data.shipment.width,
                            height: data.shipment.height,
                        },
                        package_count: data.shipment.packageCount,
                        invoice_value: data.shipment.invoiceValue,
                        payment_mode: data.shipment.paymentMode,
                        cod_amount: data.shipment.codAmount || 0,
                    },
                    order_number: data.orderNumber,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info(`Velocity shipment created: ${response.data.awb}`);

            return {
                success: true,
                awb: response.data.awb,
                carrierTrackingNumber: response.data.carrier_tracking_number,
                labelUrl: response.data.label_url,
                estimatedDelivery: response.data.estimated_delivery,
            };
        } catch (error: any) {
            logger.error('Velocity shipment creation failed:', error.response?.data || error.message);
            throw new Error(`Velocity API error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Track shipment
     */
    async trackShipment(awb: string) {
        try {
            const response = await axios.get(
                `${this.baseURL}/api/v2/shipments/${awb}/track`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                }
            );

            return {
                awb: response.data.awb,
                status: response.data.status,
                statusHistory: response.data.status_history || [],
                currentLocation: response.data.current_location,
                estimatedDelivery: response.data.estimated_delivery,
                actualDelivery: response.data.actual_delivery,
            };
        } catch (error: any) {
            logger.error(`Velocity tracking failed for ${awb}:`, error.response?.data || error.message);
            throw new Error(`Velocity tracking error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Cancel shipment
     */
    async cancelShipment(awb: string, reason: string) {
        try {
            const response = await axios.post(
                `${this.baseURL}/api/v2/shipments/${awb}/cancel`,
                { reason },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info(`Velocity shipment cancelled: ${awb}`);

            return {
                success: true,
                awb: response.data.awb,
                status: response.data.status,
                cancelledAt: response.data.cancelled_at,
            };
        } catch (error: any) {
            logger.error(`Velocity cancellation failed for ${awb}:`, error.response?.data || error.message);
            throw new Error(`Velocity cancellation error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Calculate shipping rate
     */
    async calculateRate(data: {
        fromPincode: string;
        toPincode: string;
        weight: number;
        codAmount?: number;
        paymentMode: 'cod' | 'prepaid';
    }) {
        try {
            const response = await axios.post(
                `${this.baseURL}/api/v2/rates/calculate`,
                {
                    from_pincode: data.fromPincode,
                    to_pincode: data.toPincode,
                    weight: data.weight,
                    payment_mode: data.paymentMode,
                    cod_amount: data.codAmount || 0,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                baseRate: response.data.base_rate,
                codCharges: response.data.cod_charges || 0,
                fuelSurcharge: response.data.fuel_surcharge || 0,
                gst: response.data.gst || 0,
                totalRate: response.data.total_rate,
                zone: response.data.zone,
                estimatedDays: response.data.estimated_days,
            };
        } catch (error: any) {
            logger.error('Velocity rate calculation failed:', error.response?.data || error.message);
            throw new Error(`Velocity rate error: ${error.response?.data?.message || error.message}`);
        }
    }
}

export default new VelocityProviderService();
