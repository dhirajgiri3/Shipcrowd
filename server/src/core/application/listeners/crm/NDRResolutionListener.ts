import CallLogService from '@/core/application/services/crm/communication/CallLogService';
import eventBus, { NDREventPayload } from '@/shared/events/eventBus';
import logger from '@/shared/logger/winston.logger';

class NDRResolutionListener {
    constructor() {
        this.setupListeners();
    }

    private setupListeners(): void {
        eventBus.onEvent('ndr.created', this.handleNDRCreated.bind(this));
        // We might also want to listen to updates if needed
    }

    private async handleNDRCreated(payload: any): Promise<void> {
        const ndrPayload = payload as NDREventPayload;
        try {
            logger.info('NDRResolutionListener: Handling ndr.created event', { ndrId: ndrPayload.ndrId });

            const service = CallLogService.getInstance();

            // Auto-schedule a call for the Sales Rep
            await service.createCallLog({
                companyId: ndrPayload.companyId,
                shipmentId: ndrPayload.shipmentId || 'UNKNOWN',
                ndrEventId: ndrPayload.ndrId,
                direction: 'outbound',
                scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // Schedule for 30 mins later
                notes: `Auto-generated call for NDR: ${ndrPayload.reason || 'No reason provided'}`
            });

        } catch (error) {
            logger.error('Error handling ndr.created event:', error);
        }
    }
}

export default new NDRResolutionListener();
