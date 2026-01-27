/**
 * Event Listeners Index
 *
 * Central registration point for all application event listeners.
 * Import and call registerAllListeners() during application startup.
 */

import { registerCRMTicketListeners } from './crm-ticket.listener';
import { registerDisputeListeners } from './dispute.listener';
import logger from '@/shared/logger/winston.logger';

/**
 * Register all application event listeners
 * Call this during server initialization
 */
export const registerAllListeners = (): void => {
  try {
    // CRM listeners
    registerCRMTicketListeners();
    registerDisputeListeners();

    logger.info('All event listeners registered successfully');
  } catch (error: any) {
    logger.error('Error registering event listeners:', error);
  }
};

export * from './crm-ticket.listener';
export * from './dispute.listener';
