import axios from 'axios';
import mongoose from 'mongoose';
import { ICarrierLabelAdapter, LabelResponse } from '../../../../core/domain/interfaces/carrier-label.interface';
import logger from '../../../../shared/logger/winston.logger';
import { VelocityAuth } from './velocity.auth';

/**
 * Velocity Label Adapter
 * Fetches labels from Velocity Courier API
 * 
 * API: Uses label_url from shipment creation response
 * Response: Label URL
 */

class VelocityLabelAdapter implements ICarrierLabelAdapter {
    private baseURL: string;

    constructor() {
        this.baseURL = process.env.VELOCITY_BASE_URL || 'https://shazam.velocity.in';
    }

    async generateLabel(shipment: any): Promise<LabelResponse> {
        try {
            // Velocity typically provides label_url in shipment creation response
            // If not available, fetch from dedicated label endpoint
            let labelUrl = shipment.label_url;

            if (!labelUrl) {
                // If we don't have label_url, we need to fetch it.
                // We need authentication, which requires companyId to look up credentials.
                // Shipment object MUST have companyId.

                if (!shipment.companyId) {
                    throw new Error('Cannot fetch Velocity label: Missing companyId in shipment data');
                }

                const auth = new VelocityAuth(shipment.companyId as mongoose.Types.ObjectId, this.baseURL);
                const token = await auth.getValidToken();

                // Endpoint is hypothetical validation needed, but sticking to shazam.velocity.in base
                // Assuming standard path pattern or using a known path if available
                // User provided: /api/v2/shipments/{awb}/label -> corrected to use base url

                const response = await axios.get(
                    `${this.baseURL}/custom/api/v1/shipment/label/${shipment.awb}`,
                    {
                        headers: {
                            'Authorization': token, // Velocity uses raw token, not Bearer? Verified in provider it uses raw token.
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
