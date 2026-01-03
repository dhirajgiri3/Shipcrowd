/**
 * Event Bus - Application-wide event emitter
 * 
 * Centralized event management for domain events:
 * - order.created
 * - order.updated
 * - order.cancelled
 * - rto.completed
 * - commission.calculated
 * - etc.
 */

import { EventEmitter } from 'events';
import logger from '../logger/winston.logger';

// Event types
export type AppEvent =
    | 'order.created'
    | 'order.updated'
    | 'order.cancelled'
    | 'order.shipped'
    | 'order.delivered'
    | 'rto.initiated'
    | 'rto.completed'
    | 'commission.calculated'
    | 'commission.approved'
    | 'commission.rejected'
    | 'payout.initiated'
    | 'payout.completed'
    | 'payout.failed';

// Event payload types
export interface OrderEventPayload {
    orderId: string;
    companyId: string;
    orderNumber?: string;
    status?: string;
    salesRepId?: string;
}

export interface RTOEventPayload {
    rtoId: string;
    orderId: string;
    companyId: string;
}

export interface CommissionEventPayload {
    transactionId: string;
    salesRepId: string;
    companyId: string;
    amount: number;
}

export type EventPayload = OrderEventPayload | RTOEventPayload | CommissionEventPayload;

class ApplicationEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100); // Increase for multiple listeners
    }

    /**
     * Emit an application event
     */
    emitEvent(eventName: AppEvent, payload: EventPayload): void {
        logger.debug(`Event emitted: ${eventName}`, { payload });
        this.emit(eventName, payload);
    }

    /**
     * Subscribe to an application event
     */
    onEvent(eventName: AppEvent, handler: (payload: EventPayload) => void | Promise<void>): void {
        this.on(eventName, async (payload: EventPayload) => {
            try {
                await handler(payload);
            } catch (error) {
                logger.error(`Error handling event ${eventName}:`, error);
            }
        });
    }

    /**
     * Subscribe to an event once
     */
    onceEvent(eventName: AppEvent, handler: (payload: EventPayload) => void | Promise<void>): void {
        this.once(eventName, async (payload: EventPayload) => {
            try {
                await handler(payload);
            } catch (error) {
                logger.error(`Error handling event ${eventName}:`, error);
            }
        });
    }

    /**
     * Unsubscribe from an event
     */
    offEvent(eventName: AppEvent, handler: (payload: EventPayload) => void): void {
        this.off(eventName, handler);
    }
}

// Singleton instance
export const eventBus = new ApplicationEventBus();

export default eventBus;
