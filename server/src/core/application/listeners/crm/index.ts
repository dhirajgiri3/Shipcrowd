import NDRResolutionListener from './NDRResolutionListener';
import logger from '@/shared/logger/winston.logger';

export function initializeCRMListeners(): void {
    logger.info('Initializing CRM event handlers...');
    // Just importing the singleton instance initializes the listener via constructor
    const _ = NDRResolutionListener;
    logger.info('CRM event handlers initialized successfully');
}
