import axios from 'axios';
import { ICarrierLabelAdapter, LabelResponse } from '../../../../core/domain/interfaces/carrier-label.interface';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Velocity Label Adapter
 * Fetches labels from Velocity Courier API
 * 
 * API: Uses label_url from shipment creation response
 * Response: Label URL
 */

class VelocityLabelAdapter implements ICarrierLabelAdapter {
    private apiKey: string;
    private baseURL: string;

    constructor() {
        this.apiKey = process.env.VELOCITY_API_KEY || '';
        this.baseURL = process.env.VELOCITY_BASE_URL || 'https://api.velocitycourier.com';
    }

    async generateLabel(shipment: any): Promise<LabelResponse> {
        try {
            // Velocity typically provides label_url in shipment creation response
            // If not available, fetch from dedicated label endpoint
            let labelUrl = shipment.label_url;

            if (!labelUrl) {
                const response = await axios.get(
                    `${this.baseURL}/api/v2/shipments/${shipment.awb}/label`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                labelUrl = response.data.label_url;
            }

            if (!labelUrl) {
                throw new Error('Label URL not available from Velocity');
            }

            logger.info(`Velocity label URL retrieved for AWB: ${shipment.awb}`);

            return {
                format: 'url',
                data: labelUrl,
                awb: shipment.awb,
                metadata: {
                    generatedAt: new Date(),
                    carrier: 'velocity',
                },
            };
        } catch (error: any) {
            logger.error(`Error generating Velocity label for AWB ${shipment.awb}:`, error.message);
            throw new Error(`Velocity label generation failed: ${error.message}`);
        }
    }

    getFormats(): ('pdf' | 'zpl' | 'url')[] {
        return ['url'];
    }

    getCarrierName(): string {
        return 'velocity';
    }
}

export default new VelocityLabelAdapter();
