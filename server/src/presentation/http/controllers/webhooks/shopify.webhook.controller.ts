import { Request, Response, NextFunction } from 'express';
import WebhookEvent from '../../../../infrastructure/database/mongoose/models/webhook-event.model';
import ShopifyWebhookService from '../../../../core/application/services/shopify/shopify-webhook.service';
import QueueManager from '../../../../infrastructure/utilities/queue-manager';
import winston from 'winston';

/**
 * ShopifyWebhookController
 *
 * Handles incoming Shopify webhooks.
 *
 * Pattern:
 * 1. Log webhook event
 * 2. Queue async processing
 * 3. Return 200 immediately (within 5 seconds)
 *
 * All endpoints are public but HMAC-verified via middleware.
 */

export class ShopifyWebhookController {
  private static logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  /**
   * POST /webhooks/shopify/orders/create
   */
  static async handleOrderCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).shopifyStore;
      const webhookMeta = (req as any).shopifyWebhook;
      const payload = req.body;

      // Log webhook event
      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'orders/create',
        shopifyId: webhookMeta.webhookId,
        shopifyDomain: webhookMeta.shopDomain,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta.verified,
        hmacValid: true,
      });

      if (isDuplicate) {
        this.logger.info('Duplicate webhook received', {
          webhookId: webhookMeta.webhookId,
          topic: 'orders/create',
        });
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      // Queue async processing
      await QueueManager.addJob(
        'shopify-webhook-process',
        `orders-create-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'orders/create',
          payload,
        },
        { priority: 2 }
      );

      // Record webhook received
      await store.recordWebhookReceived();

      // Return 200 immediately
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/shopify/orders/updated
   */
  static async handleOrderUpdated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).shopifyStore;
      const webhookMeta = (req as any).shopifyWebhook;
      const payload = req.body;

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'orders/updated',
        shopifyId: webhookMeta.webhookId,
        shopifyDomain: webhookMeta.shopDomain,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta.verified,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'shopify-webhook-process',
        `orders-updated-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'orders/updated',
          payload,
        }
      );

      await store.recordWebhookReceived();
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/shopify/orders/cancelled
   */
  static async handleOrderCancelled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).shopifyStore;
      const webhookMeta = (req as any).shopifyWebhook;
      const payload = req.body;

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'orders/cancelled',
        shopifyId: webhookMeta.webhookId,
        shopifyDomain: webhookMeta.shopDomain,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta.verified,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'shopify-webhook-process',
        `orders-cancelled-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'orders/cancelled',
          payload,
        }
      );

      await store.recordWebhookReceived();
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/shopify/orders/fulfilled
   */
  static async handleOrderFulfilled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).shopifyStore;
      const webhookMeta = (req as any).shopifyWebhook;
      const payload = req.body;

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'orders/fulfilled',
        shopifyId: webhookMeta.webhookId,
        shopifyDomain: webhookMeta.shopDomain,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta.verified,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'shopify-webhook-process',
        `orders-fulfilled-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'orders/fulfilled',
          payload,
        }
      );

      await store.recordWebhookReceived();
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/shopify/products/update
   */
  static async handleProductUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).shopifyStore;
      const webhookMeta = (req as any).shopifyWebhook;
      const payload = req.body;

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'products/update',
        shopifyId: webhookMeta.webhookId,
        shopifyDomain: webhookMeta.shopDomain,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta.verified,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'shopify-webhook-process',
        `products-update-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'products/update',
          payload,
        },
        { priority: 5 } // Lower priority
      );

      await store.recordWebhookReceived();
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/shopify/inventory_levels/update
   */
  static async handleInventoryUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).shopifyStore;
      const webhookMeta = (req as any).shopifyWebhook;
      const payload = req.body;

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'inventory_levels/update',
        shopifyId: webhookMeta.webhookId,
        shopifyDomain: webhookMeta.shopDomain,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta.verified,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'shopify-webhook-process',
        `inventory-update-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'inventory_levels/update',
          payload,
        },
        { priority: 4 }
      );

      await store.recordWebhookReceived();
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/shopify/app/uninstalled
   */
  static async handleAppUninstalled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).shopifyStore;
      const webhookMeta = (req as any).shopifyWebhook;
      const payload = req.body;

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'app/uninstalled',
        shopifyId: webhookMeta.webhookId,
        shopifyDomain: webhookMeta.shopDomain,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta.verified,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      // Critical webhook - process with high priority
      await QueueManager.addJob(
        'shopify-webhook-process',
        `app-uninstalled-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'app/uninstalled',
          payload,
        },
        { priority: 1 } // Highest priority
      );

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/shopify/shop/update
   */
  static async handleShopUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).shopifyStore;
      const webhookMeta = (req as any).shopifyWebhook;
      const payload = req.body;

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'shop/update',
        shopifyId: webhookMeta.webhookId,
        shopifyDomain: webhookMeta.shopDomain,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta.verified,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'shopify-webhook-process',
        `shop-update-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'shop/update',
          payload,
        },
        { priority: 5 } // Lower priority
      );

      await store.recordWebhookReceived();
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }
}

export default ShopifyWebhookController;
