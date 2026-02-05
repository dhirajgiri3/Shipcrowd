import { ICourierStatusMapper } from '@/core/domain/courier/courier-status-mapper.interface';

const NDR_NSL_CODES = ['EOD-74', 'EOD-15', 'EOD-104', 'EOD-43', 'EOD-86', 'EOD-11', 'EOD-69', 'EOD-6'];

export class DelhiveryStatusMapper implements ICourierStatusMapper {
    extractFields(payload: any): {
        awb: string;
        status: string;
        location?: string;
        description?: string;
        weight?: { value: number; unit: 'kg' | 'g' };
        dimensions?: { length: number; width: number; height: number };
        timestamp?: Date;
    } {
        const shipment = payload?.Shipment || payload?.shipment || payload;
        const status = shipment?.Status || {};

        const result: any = {
            awb: shipment?.AWB || shipment?.awb || '',
            status: `${status?.StatusType || ''}|${status?.Status || ''}|${shipment?.NSLCode || ''}`.trim(),
            location: status?.StatusLocation || '',
            description: status?.Instructions || '',
            timestamp: status?.StatusDateTime ? new Date(status.StatusDateTime) : new Date()
        };

        // Extract weight (Delhivery usually sends weight in kg)
        const weightVal = shipment?.ChargedWeight || shipment?.ScannedWeight || shipment?.weight;
        if (weightVal) {
            const value = parseFloat(weightVal);
            if (!isNaN(value) && value > 0) {
                result.weight = {
                    value,
                    unit: 'kg' // Delhivery standard is kg
                };
            }
        }

        // Extract dimensions (Format: "LxWxH" in cm)
        const dims = shipment?.Dimensions || shipment?.dimensions;
        if (dims && typeof dims === 'string' && dims.includes('x')) {
            const parts = dims.split('x').map(parseFloat);
            if (parts.length === 3 && !parts.some(isNaN)) {
                result.dimensions = {
                    length: parts[0],
                    width: parts[1],
                    height: parts[2]
                };
            }
        }

        return result;
    }

    mapStatus(delhiveryStatus: string): string {
        const parts = (delhiveryStatus || '').split('|').map((p) => p.trim().toUpperCase());
        const statusType = parts[0] || '';
        const status = parts[1] || '';
        const nsl = parts[2] || '';

        if (statusType === 'UD' && nsl && NDR_NSL_CODES.includes(nsl)) {
            return 'ndr';
        }

        if (statusType === 'DL' && status === 'DELIVERED') return 'delivered';
        if (statusType === 'DL' && status === 'DTO') return 'delivered';
        if (statusType === 'DL' && status === 'RTO') return 'rto';

        if (statusType === 'RT') return 'rto';
        if (statusType === 'CN') return 'cancelled';

        if (statusType === 'PP' || statusType === 'PU') return 'in_transit';
        if (statusType === 'UD' && status === 'DISPATCHED') return 'out_for_delivery';
        if (statusType === 'UD') return 'in_transit';

        return 'unknown';
    }

    getCourierName(): string {
        return 'Delhivery';
    }
}
