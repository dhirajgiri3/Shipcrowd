import axios from 'axios';
import { ICarrierLabelAdapter, LabelResponse } from '../../../../core/domain/interfaces/carrier-label.interface';
import logger from '../../../../shared/logger/winston.logger';

/**
 * India Post Label Adapter
 * Fetches labels from India Post Speed Post API
 * 
 * API: POST /speedpost/api/labels
 * Response: PDF buffer
 */

class IndiaPostLabelAdapter implements ICarrierLabelAdapter {
    private apiKey: string;
    private baseURL: string;

    constructor() {
        this.apiKey = process.env.INDIA_POST_API_KEY || '';
        this.baseURL = process.env.INDIA_POST_BASE_URL || 'https://trackapi.indiapost.gov.in';
    }

    async generateLabel(shipment: any): Promise<LabelResponse> {
        try {
            const response = await axios.post(
                `${this.baseURL}/speedpost/api/labels`,
                {
                    articleId: shipment.awb,
                    labelType: 'thermal', // or 'a4'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'arraybuffer',
                }
            );

            const buffer = Buffer.from(response.data);

            logger.info(`India Post label generated for AWB: ${shipment.awb}`);

            return {
                format: 'pdf',
                data: buffer,
                awb: shipment.awb,
                metadata: {
                    generatedAt: new Date(),
                    carrier: 'india_post',
                    size: '4x6',
                },
            };
        } catch (error: any) {
            logger.error(`Error generating India Post label for AWB ${shipment.awb}:`, error.message);
            throw new Error(`India Post label generation failed: ${error.message}`);
        }
    }

    getFormats(): ('pdf' | 'zpl' | 'url')[] {
        return ['pdf'];
    }

    getCarrierName(): string {
        return 'india_post';
    }
}

export default new IndiaPostLabelAdapter();
