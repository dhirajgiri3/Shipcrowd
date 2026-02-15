import logger from '@/shared/logger/winston.logger';
import NDRResolutionListener from './NDRResolutionListener';

export function initializeCRMListeners(): void {
    logger.info('Initializing CRM event handlers...');
    // Just importing the singleton instance initializes the listener via constructor
    const _ = NDRResolutionListener;
void _;
    logger.info('CRM event handlers initialized successfully');
}
