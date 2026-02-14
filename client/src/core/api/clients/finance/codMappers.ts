import type {
    APIEnvelope,
    APIPaginatedEnvelope,
    BackendEligibleShipmentsResponse,
    BackendRemittance,
    CODRemittance,
    CODRemittanceResponse,
    CODStats,
    EligibleShipmentsResponse,
    ShipmentInRemittance,
    Timeline,
} from '@/src/types/api/finance';

function assertObject(value: unknown, context: string): Record<string, any> {
    if (!value || typeof value !== 'object') {
        throw new Error(`[COD] Invalid ${context}: expected object`);
    }
    return value as Record<string, any>;
}

function getTimeline(remittance: BackendRemittance): Timeline {
    const entries = remittance.timeline || [];
    const findStatus = (status: string) =>
        entries.find((entry) => entry.status === status)?.timestamp;

    return {
        batchCreated: findStatus('draft') || remittance.batch?.createdDate || remittance.createdAt,
        approvedAt: findStatus('approved') || (remittance.approvedBy ? remittance.updatedAt : undefined),
        payoutInitiatedAt: findStatus('processing') || remittance.payout?.initiatedAt,
        completedAt: findStatus('paid') || remittance.payout?.completedAt || remittance.payout?.processedAt,
        cancelledAt: findStatus('cancelled') || remittance.cancelledAt,
    };
}

function mapShipment(shipment: BackendRemittance['shipments'][number]): ShipmentInRemittance {
    const shipmentDoc = typeof shipment.shipmentId === 'object' ? shipment.shipmentId : undefined;
    const awb = shipment.awb || shipmentDoc?.awb || shipmentDoc?.trackingNumber || '';

    return {
        shipmentId: {
            _id: shipmentDoc?._id || (typeof shipment.shipmentId === 'string' ? shipment.shipmentId : ''),
            awb,
            orderId: {
                _id: shipmentDoc?.orderId?._id || '',
                orderNumber: shipmentDoc?.orderId?.orderNumber || '',
                productDetails: shipmentDoc?.orderId?.productDetails,
                customerDetails: shipmentDoc?.orderId?.customerDetails
                    ? {
                          name: shipmentDoc.orderId.customerDetails.name || '',
                          phone: shipmentDoc.orderId.customerDetails.phone || '',
                      }
                    : undefined,
            },
            deliveredAt: shipmentDoc?.actualDelivery || shipment.deliveredAt,
            status: shipmentDoc?.currentStatus || shipment.status,
            courierPartner: shipmentDoc?.courierPartner,
            weight: shipmentDoc?.weight,
        },
        awb,
        codAmount: shipment.codAmount || 0,
        deliveredAt: shipment.deliveredAt,
        status: shipment.status,
        deductions: shipment.deductions || { shippingCharge: 0, total: 0 },
        netAmount: shipment.netAmount || 0,
    };
}

export function mapBackendRemittanceToUI(remittance: BackendRemittance): CODRemittance {
    const d = remittance.financial?.deductionsSummary;
    const deductionsTotal = d?.grandTotal || 0;

    return {
        _id: remittance._id,
        companyId: remittance.companyId,
        remittanceId: remittance.remittanceId,
        batch: {
            batchNumber: remittance.batch?.batchNumber || 0,
            shipmentsCount: remittance.financial?.totalShipments || remittance.shipments?.length || 0,
            totalCODCollected: remittance.financial?.totalCODCollected || 0,
            totalShippingCost: d?.totalShippingCharges || 0,
            totalOtherDeductions: (d?.totalOtherFees || 0) + (d?.totalPlatformFees || 0),
            netPayable: remittance.financial?.netPayable || 0,
        },
        shipments: (remittance.shipments || []).map(mapShipment),
        deductions: {
            shippingCost: d?.totalShippingCharges || 0,
            codHandlingCharges: d?.totalPlatformFees || 0,
            rtoCharges: d?.totalRTOCharges || 0,
            weightDiscrepancyCharges: d?.totalWeightDisputes || 0,
            otherCharges: (d?.totalOtherFees || 0) + (d?.totalInsuranceCharges || 0),
            tds: 0,
            total: deductionsTotal,
        },
        finalPayable: remittance.financial?.netPayable || 0,
        status: remittance.status,
        payout: remittance.payout
            ? {
                  razorpayPayoutId: remittance.payout.razorpayPayoutId,
                  utr: remittance.settlementDetails?.utrNumber,
                  status: remittance.payout.status,
                  initiatedAt: remittance.payout.initiatedAt,
                  processedAt: remittance.payout.completedAt || remittance.payout.processedAt,
                  failureReason: remittance.payout.failureReason,
              }
            : undefined,
        bankAccount: {
            accountNumber: remittance.payout?.accountDetails?.accountNumber || '',
            ifsc: remittance.payout?.accountDetails?.ifscCode || '',
            accountHolderName: remittance.payout?.accountDetails?.accountHolderName || '',
            bankName: remittance.payout?.accountDetails?.bankName || '',
        },
        timeline: getTimeline(remittance),
        approvedBy: remittance.approvedBy,
        approvalNotes: remittance.approvalNotes,
        createdBy: remittance.schedule?.requestedBy,
        createdAt: remittance.createdAt,
        updatedAt: remittance.updatedAt,
    };
}

export function mapRemittanceListEnvelope(payload: unknown): CODRemittanceResponse {
    const envelope = assertObject(payload, 'remittance list envelope') as APIPaginatedEnvelope<BackendRemittance>;
    if (!Array.isArray(envelope.data) || !envelope.pagination) {
        throw new Error('[COD] Invalid remittance list response: missing data/pagination');
    }
    return {
        remittances: envelope.data.map(mapBackendRemittanceToUI),
        pagination: envelope.pagination,
    };
}

export function mapRemittanceEnvelope(payload: unknown): CODRemittance {
    const envelope = assertObject(payload, 'remittance detail envelope') as APIEnvelope<{ remittance: BackendRemittance }>;
    const remittance = envelope?.data?.remittance;
    if (!remittance) {
        throw new Error('[COD] Invalid remittance detail response: missing remittance');
    }
    return mapBackendRemittanceToUI(remittance);
}

export function mapStatsEnvelope(payload: unknown): CODStats {
    const envelope = assertObject(payload, 'stats envelope') as APIEnvelope<CODStats>;
    if (!envelope.data || !envelope.data.pendingCollection || !envelope.data.available || !envelope.data.thisMonth) {
        throw new Error('[COD] Invalid dashboard stats response');
    }
    return envelope.data;
}

export function mapEligibleEnvelope(payload: unknown): EligibleShipmentsResponse {
    const envelope = assertObject(payload, 'eligible shipments envelope') as APIEnvelope<BackendEligibleShipmentsResponse>;
    const data = envelope.data;
    if (!data || !Array.isArray(data.shipments) || !data.summary) {
        throw new Error('[COD] Invalid eligible shipments response');
    }
    return {
        shipments: data.shipments.map((shipment) => ({
            awb: shipment.awb,
            orderId: shipment.shipmentId,
            codAmount: shipment.codAmount || 0,
            deliveredAt: shipment.deliveredAt,
            shippingCost: shipment.shippingCost || shipment.deductions?.shippingCharge || 0,
        })),
        summary: {
            totalShipments: data.summary.totalShipments || 0,
            totalCODAmount: data.summary.totalCOD || 0,
            totalShippingCost: data.summary.totalDeductions || 0,
            estimatedPayable: data.summary.netPayable || 0,
        },
    };
}
