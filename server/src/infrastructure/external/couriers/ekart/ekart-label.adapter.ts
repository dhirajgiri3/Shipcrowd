import axios from 'axios';
import { ICarrierLabelAdapter, LabelResponse } from '../../../../core/domain/interfaces/carrier-label.interface';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Ekart Label Adapter
 * Fetches labels from Ekart Logistics API
 * 
 * API: GET /ekart/api/v1/labels/{awb}
 * Response: Label URL or PDF buffer
 */

class EkartLabelAdapter implements ICarrierLabelAdapter {
    private apiKey: string;
    private baseURL: string;

    constructor() {
        this.apiKey = process.env.EKART_API_KEY || '';
        this.baseURL = process.env.EKART_BASE_URL || 'https://api.ekartlogistics.com';
    }

    async generateLabel(shipment: any): Promise<LabelResponse> {
        try {
            const response = await axios.get(
                `${this.baseURL}/ekart/api/v1/labels/${shipment.awb}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            // Ekart typically returns a label URL
            const labelUrl = response.data.labelUrl || response.data.label_url;

            if (!labelUrl) {
                throw new Error('Label URL not found in Ekart response');
            }

            logger.info(`Ekart label URL retrieved for AWB: ${shipment.awb}`);

            return {
                format: 'url',
                data: labelUrl,
                awb: shipment.awb,
                metadata: {
                    generatedAt: new Date(),
                    carrier: 'ekart',
                },
            };
        } catch (error: any) {
            logger.error(`Error generating Ekart label for AWB ${shipment.awb}:`, error.message);
            throw new Error(`Ekart label generation failed: ${error.message}`);
        }
    }

    getFormats(): ('pdf' | 'zpl' | 'url')[] {
        return ['url'];
    }

    getCarrierName(): string {
        return 'ekart';
    }
}

export default new EkartLabelAdapter();
