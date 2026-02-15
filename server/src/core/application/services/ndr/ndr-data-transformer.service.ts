/**
 * NDR Data Transformer Service
 *
 * Transforms backend NDR data structure to match frontend expectations.
 * Handles field mapping, calculations, and data enrichment.
 */

import mongoose from 'mongoose';

export interface TransformedNDRCase {
    _id: string;
    ndrId: string;
    shipmentId: {
        _id: string;
        trackingNumber: string;
        carrier?: string;
        currentStatus?: string;
    } | string;
    orderId: {
        _id: string;
        orderNumber: string;
        paymentMethod?: 'COD' | 'PREPAID';
    } | string;
    companyId: string;
    status: string;
    primaryReason: string;
    currentAttempt: {
        attemptNumber: number;
        attemptDate: string;
        reason: string;
        reasonDescription: string;
        courierRemarks?: string;
    };
    allAttempts: any[];
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    deliveryAddress: string;
    communications: any[];
    resolutionActions: any[];
    reportedAt: string;
    slaDeadline: string;
    slaBreach: boolean;
    daysSinceReported: number;
    magicLinkClicked?: boolean;
    magicLinkClickedAt?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    escalatedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export class NDRDataTransformerService {
    /**
     * Transform single NDR event to frontend format
     */
    static transformNDREvent(event: any): TransformedNDRCase {
        const now = new Date();
        const reportedDate = new Date(event.detectedAt);
        const slaDeadline = new Date(event.resolutionDeadline);

        // Calculate days since reported
        const daysSinceReported = Math.floor(
            (now.getTime() - reportedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check SLA breach
        const slaBreach = now > slaDeadline && event.status !== 'resolved';

        // Generate NDR ID if not exists
        const ndrId = this.generateNDRId(event);

        // Extract customer info from populated order
        const customerInfo = this.extractCustomerInfo(event);

        // Transform shipment data
        const shipmentData = this.transformShipmentData(event.shipment);

        // Transform order data
        const orderData = this.transformOrderData(event.order);

        return {
            _id: event._id.toString(),
            ndrId,
            shipmentId: shipmentData,
            orderId: orderData,
            companyId: event.company.toString(),

            // Map status (backend to frontend)
            status: this.mapStatus(event.status),

            // Map reason field name
            primaryReason: event.ndrReasonClassified || event.ndrReason || 'other',

            // Current attempt
            currentAttempt: {
                attemptNumber: event.attemptNumber,
                attemptDate: event.detectedAt.toISOString(),
                reason: event.ndrReasonClassified || event.ndrReason,
                reasonDescription: event.ndrReason,
                courierRemarks: event.courierRemarks,
            },

            // All attempts (for now, just current one)
            allAttempts: [{
                attemptNumber: event.attemptNumber,
                attemptDate: event.detectedAt.toISOString(),
                reason: event.ndrReasonClassified || event.ndrReason,
                reasonDescription: event.ndrReason,
                courierRemarks: event.courierRemarks,
            }],

            // Customer information
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            customerEmail: customerInfo.email,
            deliveryAddress: customerInfo.address,

            // Communications (map from resolutionActions)
            communications: this.transformCommunications(event.resolutionActions),

            // Resolution actions
            resolutionActions: event.resolutionActions || [],

            // Timing fields
            reportedAt: event.detectedAt.toISOString(),
            slaDeadline: event.resolutionDeadline.toISOString(),
            slaBreach,
            daysSinceReported,

            // Magic link tracking
            magicLinkClicked: event.magicLinkClicked,
            magicLinkClickedAt: event.magicLinkClickedAt?.toISOString(),

            // Resolution
            resolvedAt: event.resolvedAt?.toISOString(),
            resolvedBy: event.resolvedBy,

            // Escalation
            escalatedAt: event.status === 'escalated' ? event.updatedAt.toISOString() : undefined,

            // Timestamps
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
        };
    }

    /**
     * Transform array of NDR events
     */
    static transformNDREvents(events: any[]): TransformedNDRCase[] {
        return events.map(event => this.transformNDREvent(event));
    }

    /**
     * Map backend status to frontend status
     */
    private static mapStatus(backendStatus: string): string {
        const statusMap: Record<string, string> = {
            'detected': 'detected', // or 'open' for legacy support
            'in_resolution': 'in_progress',
            'resolved': 'resolved',
            'escalated': 'escalated',
            'rto_triggered': 'rto_triggered', // or 'converted_to_rto' for legacy
        };
        return statusMap[backendStatus] || backendStatus;
    }

    /**
     * Generate NDR ID in format: NDR-YYYYMMDD-XXXXX
     */
    private static generateNDRId(event: any): string {
        const date = new Date(event.detectedAt);
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const idSuffix = event._id.toString().slice(-5).toUpperCase();
        return `NDR-${dateStr}-${idSuffix}`;
    }

    /**
     * Extract customer info from populated order
     */
    private static extractCustomerInfo(event: any): {
        name: string;
        phone: string;
        email?: string;
        address: string;
    } {
        if (event.order && typeof event.order === 'object' && event.order.customerInfo) {
            const info = event.order.customerInfo;
            const addr = info.address;
            const addressParts = [
                addr?.line1,
                addr?.line2,
                addr?.city,
                addr?.state,
                addr?.postalCode
            ].filter(Boolean);

            return {
                name: info.name || 'Unknown Customer',
                phone: info.phone || 'N/A',
                email: info.email,
                address: addressParts.join(', ') || 'Address not available'
            };
        }

        // Fallback if order not populated
        return {
            name: 'Unknown Customer',
            phone: 'N/A',
            address: 'Address not available'
        };
    }

    /**
     * Transform shipment data
     */
    private static transformShipmentData(shipment: any): any {
        if (!shipment) {
            return '';
        }

        if (typeof shipment === 'string' || shipment instanceof mongoose.Types.ObjectId) {
            return shipment.toString();
        }

        return {
            _id: shipment._id.toString(),
            trackingNumber: shipment.trackingNumber || shipment.awb || 'N/A',
            carrier: shipment.carrier || shipment.courierPartner,
            currentStatus: shipment.currentStatus
        };
    }

    /**
     * Transform order data
     */
    private static transformOrderData(order: any): any {
        if (!order) {
            return '';
        }

        if (typeof order === 'string' || order instanceof mongoose.Types.ObjectId) {
            return order.toString();
        }

        return {
            _id: order._id.toString(),
            orderNumber: order.orderNumber || 'N/A',
            paymentMethod: order.paymentMethod?.toUpperCase() as 'COD' | 'PREPAID'
        };
    }

    /**
     * Transform resolution actions to communications format
     */
    private static transformCommunications(resolutionActions: any[]): any[] {
        if (!resolutionActions || resolutionActions.length === 0) {
            return [];
        }

        return resolutionActions
            .filter(action => ['send_whatsapp', 'send_email', 'send_sms', 'call_customer'].includes(action.actionType))
            .map(action => ({
                channel: this.mapActionTypeToChannel(action.actionType),
                sentAt: action.takenAt,
                deliveredAt: action.result === 'success' ? action.takenAt : undefined,
                readAt: action.metadata?.read ? new Date().toISOString() : undefined,
                template: action.action,
                responseReceivedAt: action.metadata?.responseReceived ? new Date().toISOString() : undefined,
                customerResponse: action.metadata?.customerResponse
            }));
    }

    /**
     * Map action type to communication channel
     */
    private static mapActionTypeToChannel(actionType: string): 'sms' | 'email' | 'whatsapp' | 'call' {
        const channelMap: Record<string, 'sms' | 'email' | 'whatsapp' | 'call'> = {
            'send_sms': 'sms',
            'send_email': 'email',
            'send_whatsapp': 'whatsapp',
            'call_customer': 'call'
        };
        return channelMap[actionType] || 'sms';
    }
}
