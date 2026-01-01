/**
 * WooCommerce Webhook Controller
 *
 * Handles incoming WooCommerce webhook events.
 * All endpoints are public but require HMAC verification.
 */

import { Request, Response, NextFunction } from 'express';
import WooCommerceWebhookService from '../../../../core/application/services/woocommerce/WooCommerceWebhookService';
import logger from '../../../../shared/logger/winston.logger';

export default class WooCommerceWebhookController {
  /**
   * Handle order created webhook
   * POST /api/v1/webhooks/woocommerce/order/created
   */
  static async handleOrderCreated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).woocommerceStore;
      const payload = req.body;

      logger.info('Received order.created webhook', {
        storeId: store._id,
        orderId: payload.id,
      });

      // Process webhook asynchronously
      WooCommerceWebhookService.handleOrderCreated(payload, store._id.toString()).catch(
        (error) => {
          logger.error('Async webhook processing failed', {
            topic: 'order.created',
            error: error.message,
          });
        }
      );

      // Return 200 immediately
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle order updated webhook
   * POST /api/v1/webhooks/woocommerce/order/updated
   */
  static async handleOrderUpdated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).woocommerceStore;
      const payload = req.body;

      logger.info('Received order.updated webhook', {
        storeId: store._id,
        orderId: payload.id,
      });

      WooCommerceWebhookService.handleOrderUpdated(payload, store._id.toString()).catch(
        (error) => {
          logger.error('Async webhook processing failed', {
            topic: 'order.updated',
            error: error.message,
          });
        }
      );

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle order deleted webhook
   * POST /api/v1/webhooks/woocommerce/order/deleted
   */
  static async handleOrderDeleted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).woocommerceStore;
      const payload = req.body;

      logger.info('Received order.deleted webhook', {
        storeId: store._id,
        orderId: payload.id,
      });

      WooCommerceWebhookService.handleOrderDeleted(payload, store._id.toString()).catch(
        (error) => {
          logger.error('Async webhook processing failed', {
            topic: 'order.deleted',
            error: error.message,
          });
        }
      );

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle product created webhook
   * POST /api/v1/webhooks/woocommerce/product/created
   */
  static async handleProductCreated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).woocommerceStore;
      const payload = req.body;

      logger.info('Received product.created webhook', {
        storeId: store._id,
        productId: payload.id,
      });

      WooCommerceWebhookService.handleProductCreated(payload, store._id.toString()).catch(
        (error) => {
          logger.error('Async webhook processing failed', {
            topic: 'product.created',
            error: error.message,
          });
        }
      );

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle product updated webhook
   * POST /api/v1/webhooks/woocommerce/product/updated
   */
  static async handleProductUpdated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).woocommerceStore;
      const payload = req.body;

      logger.info('Received product.updated webhook', {
        storeId: store._id,
        productId: payload.id,
      });

      WooCommerceWebhookService.handleProductUpdated(payload, store._id.toString()).catch(
        (error) => {
          logger.error('Async webhook processing failed', {
            topic: 'product.updated',
            error: error.message,
          });
        }
      );

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle product deleted webhook
   * POST /api/v1/webhooks/woocommerce/product/deleted
   */
  static async handleProductDeleted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).woocommerceStore;
      const payload = req.body;

      logger.info('Received product.deleted webhook', {
        storeId: store._id,
        productId: payload.id,
      });

      WooCommerceWebhookService.handleProductDeleted(payload, store._id.toString()).catch(
        (error) => {
          logger.error('Async webhook processing failed', {
            topic: 'product.deleted',
            error: error.message,
          });
        }
      );

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle customer created webhook
   * POST /api/v1/webhooks/woocommerce/customer/created
   */
  static async handleCustomerCreated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).woocommerceStore;
      const payload = req.body;

      logger.info('Received customer.created webhook', {
        storeId: store._id,
        customerId: payload.id,
      });

      WooCommerceWebhookService.handleCustomerCreated(payload, store._id.toString()).catch(
        (error) => {
          logger.error('Async webhook processing failed', {
            topic: 'customer.created',
            error: error.message,
          });
        }
      );

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle customer updated webhook
   * POST /api/v1/webhooks/woocommerce/customer/updated
   */
  static async handleCustomerUpdated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).woocommerceStore;
      const payload = req.body;

      logger.info('Received customer.updated webhook', {
        storeId: store._id,
        customerId: payload.id,
      });

      WooCommerceWebhookService.handleCustomerUpdated(payload, store._id.toString()).catch(
        (error) => {
          logger.error('Async webhook processing failed', {
            topic: 'customer.updated',
            error: error.message,
          });
        }
      );

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }
}
