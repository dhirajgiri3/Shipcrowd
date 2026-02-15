import { NextFunction, Request, Response } from 'express';
import WebhookEvent from '../../../../../infrastructure/database/mongoose/models/system/integrations/webhook-event.model';
import QueueManager from '../../../../../infrastructure/utilities/queue-manager';
import logger from '../../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';

export default class WooCommerceWebhookController {
  private static async enqueueWebhook(
    req: Request,
    res: Response,
    topic: string,
    idField: string
  ): Promise<void> {
    const store = (req as any).woocommerceStore;
    const payload = req.body;
    const headers = req.headers as Record<string, string>;

    // Generate deterministic event ID (not time-based to prevent duplicates)
    const eventId = `woo-${topic}-${store._id}-${payload.id}`;

    logger.info(`Received ${topic} webhook`, {
      storeId: store._id,
      eventId,
      [idField]: payload.id,
    });

    // Persist webhook event for audit trail and duplicate prevention
    const { event, isDuplicate } = await WebhookEvent.createEvent({
      storeId: String(store._id),
      companyId: String(store.companyId),
      platform: 'woocommerce',
      topic,
      eventId,
      platformDomain: store.storeUrl,
      payload,
      headers,
      verified: true,
      hmacValid: req.get('x-wc-webhook-signature') ? true : false,
    });

    if (isDuplicate) {
      logger.info('Duplicate webhook event detected, skipping processing', { eventId });
      sendSuccess(res, { received: true, duplicate: true });
      return;
    }

    // Enqueue for async processing
    await QueueManager.addJob(
      'woocommerce-webhook-process',
      `woo-${topic}-${event._id}`,
      {
        storeId: String(store._id),
        topic,
        payload,
      },
      { priority: 2 }
    );

    sendSuccess(res, { received: true });
  }

  static async handleOrderCreated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.enqueueWebhook(req, res, 'order.created', 'orderId');
    } catch (error) {
      next(error);
    }
  }

  static async handleOrderUpdated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.enqueueWebhook(req, res, 'order.updated', 'orderId');
    } catch (error) {
      next(error);
    }
  }

  static async handleOrderDeleted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.enqueueWebhook(req, res, 'order.deleted', 'orderId');
    } catch (error) {
      next(error);
    }
  }

  static async handleProductCreated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.enqueueWebhook(req, res, 'product.created', 'productId');
    } catch (error) {
      next(error);
    }
  }

  static async handleProductUpdated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.enqueueWebhook(req, res, 'product.updated', 'productId');
    } catch (error) {
      next(error);
    }
  }

  static async handleProductDeleted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.enqueueWebhook(req, res, 'product.deleted', 'productId');
    } catch (error) {
      next(error);
    }
  }

  static async handleCustomerCreated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.enqueueWebhook(req, res, 'customer.created', 'customerId');
    } catch (error) {
      next(error);
    }
  }

  static async handleCustomerUpdated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.enqueueWebhook(req, res, 'customer.updated', 'customerId');
    } catch (error) {
      next(error);
    }
  }
}
