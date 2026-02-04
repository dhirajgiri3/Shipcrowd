import { ICourierStatusMapper } from '@/core/domain/courier/courier-status-mapper.interface';

const NDR_NSL_CODES = ['EOD-74', 'EOD-15', 'EOD-104', 'EOD-43', 'EOD-86', 'EOD-11', 'EOD-69', 'EOD-6'];

export class DelhiveryStatusMapper implements ICourierStatusMapper {
    extractFields(payload: any): { awb: string; status: string; location?: string; description?: string } {
        const shipment = payload?.Shipment || payload?.shipment || payload;
        const status = shipment?.Status || {};

        return {
            awb: shipment?.AWB || shipment?.awb || '',
            status: `${status?.StatusType || ''}|${status?.Status || ''}|${shipment?.NSLCode || ''}`.trim(),
            location: status?.StatusLocation || '',
            description: status?.Instructions || ''
        };
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
