import { Request, Response, NextFunction } from 'express';
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

    logger.info(`Received ${topic} webhook`, {
      storeId: store._id,
      [idField]: payload.id,
    });

    await QueueManager.addJob(
      'woocommerce-webhook-process',
      `${topic}-${store._id}-${Date.now()}`,
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
