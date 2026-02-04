import axios from 'axios';
import { ICarrierLabelAdapter, LabelResponse } from '../../../../core/domain/interfaces/carrier-label.interface';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Delhivery Label Adapter
 * Fetches labels from Delhivery API
 *
 * API: GET /api/p/packing_slip?wbns={waybill}&pdf=true&pdf_size=4R
 */

class DelhiveryLabelAdapter implements ICarrierLabelAdapter {
    private apiKey: string;
    private baseURL: string;

    constructor() {
        this.apiKey = process.env.DELHIVERY_API_TOKEN || process.env.DELHIVERY_API_KEY || '';
        this.baseURL = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';
    }

    async generateLabel(shipment: any): Promise<LabelResponse> {
        try {
            const response = await axios.get(
                `${this.baseURL}/api/p/packing_slip`,
                {
                    headers: {
                        'Authorization': `Token ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    params: {
                        wbns: shipment.awb,
                        pdf: true,
                        pdf_size: '4R'
                    },
                    responseType: 'arraybuffer',
                }
            );

            const buffer = Buffer.from(response.data);

            logger.info(`Delhivery label generated for AWB: ${shipment.awb}`);

            return {
                format: 'pdf',
                data: buffer,
                awb: shipment.awb,
                metadata: {
                    generatedAt: new Date(),
                    carrier: 'delhivery',
                    size: '4x6',
                },
            };
        } catch (error: any) {
            logger.error(`Error generating Delhivery label for AWB ${shipment.awb}:`, error.message);
            throw new Error(`Delhivery label generation failed: ${error.message}`);
        }
    }

    getFormats(): ('pdf' | 'zpl' | 'url')[] {
        return ['pdf'];
    }

    getCarrierName(): string {
        return 'delhivery';
    }
}

export default new DelhiveryLabelAdapter();
