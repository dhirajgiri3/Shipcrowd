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
    async generateLabel(shipment: any): Promise<LabelResponse> {
        try {
            // Velocity typically provides label_url in shipment creation response
            // If not available, fetch from dedicated label endpoint
            let labelUrl = shipment.label_url;

            if (!labelUrl) {
                // Velocity labels are provided during shipment creation.
                // There is no documented public endpoint to fetch a label simply by AWB without a complex specific flow which is not guaranteed.
                // We rely on the stored labelUrl.

                logger.warn(`Velocity label URL missing in shipment data for AWB: ${shipment.awb}`);
                throw new Error('Label URL not available in shipment data. Please check shipment creation logs.');
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
