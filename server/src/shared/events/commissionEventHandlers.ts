/**
 * Commission Event Handlers
 * 
 * Subscribes to order/RTO events and triggers commission calculations
 */

import { CommissionCalculationService } from '../../core/application/services/commission/index';
import eventBus, { OrderEventPayload, RTOEventPayload } from '../events/eventBus';
import logger from '../logger/winston.logger';

/**
 * Initialize commission event listeners
 */
export function initializeCommissionEventHandlers(): void {
    logger.info('Initializing commission event handlers...');

    // Order created event
    eventBus.onEvent('order.created', async (payload) => {
        const { orderId, companyId } = payload as OrderEventPayload;
        try {
            await CommissionCalculationService.handleOrderCreated(orderId, companyId);
        } catch (error) {
            logger.error('Commission handler error for order.created:', error);
        }
    });

    // Order updated event
    eventBus.onEvent('order.updated', async (payload) => {
        const { orderId, companyId } = payload as OrderEventPayload;
        try {
            await CommissionCalculationService.handleOrderUpdated(orderId, companyId);
        } catch (error) {
            logger.error('Commission handler error for order.updated:', error);
        }
    });

    // Order cancelled event
    eventBus.onEvent('order.cancelled', async (payload) => {
        const { orderId, companyId } = payload as OrderEventPayload;
        try {
            await CommissionCalculationService.handleOrderCancelled(orderId, companyId);
        } catch (error) {
            logger.error('Commission handler error for order.cancelled:', error);
        }
    });

    // RTO completed event
    eventBus.onEvent('rto.completed', async (payload) => {
        const { orderId, companyId } = payload as RTOEventPayload;
        try {
            await CommissionCalculationService.handleRTOCompleted(orderId, companyId);
        } catch (error) {
            logger.error('Commission handler error for rto.completed:', error);
        }
    });

    logger.info('Commission event handlers initialized successfully');
}

export default initializeCommissionEventHandlers;
