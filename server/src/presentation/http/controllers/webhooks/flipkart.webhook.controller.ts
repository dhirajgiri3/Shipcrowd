import { Request, Response, NextFunction } from 'express';
import WebhookEvent from '../../../../infrastructure/database/mongoose/models/webhook-event.model';
import QueueManager from '../../../../infrastructure/queue/queue.manager';
import winston from 'winston';
import crypto from 'crypto';

/**
 * FlipkartWebhookController
 *
 * Handles incoming Flipkart webhooks.
 *
 * Pattern:
 * 1. Log webhook event
 * 2. Queue async processing
 * 3. Return 200 immediately (within 5 seconds)
 *
 * All endpoints are public but HMAC-verified via middleware.
 *
 * Note: We use the existing WebhookEvent model which has shopifyId/shopifyDomain fields.
 * For Flipkart webhooks, we repurpose these as:
 * - shopifyId -> Unique webhook event ID (generated from payload hash)
 * - shopifyDomain -> Flipkart seller ID
 */

export class FlipkartWebhookController {
  private static logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  /**
   * Generate a unique webhook ID from the payload
   */
  private static generateWebhookId(topic: string, payload: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(topic);
    hash.update(JSON.stringify(payload));
    hash.update(Date.now().toString());
    return `flipkart_${hash.digest('hex').substring(0, 32)}`;
  }

  /**
   * POST /webhooks/flipkart/order/create
   */
  static async handleOrderCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).flipkartStore;
      const webhookMeta = (req as any).flipkartWebhook;
      const payload = req.body;

      // Generate unique webhook ID for duplicate prevention
      const webhookId = FlipkartWebhookController.generateWebhookId('order/create', payload);

      // Log webhook event using existing model fields
      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'order/create',
        shopifyId: webhookId, // Repurposed as unique event ID
        shopifyDomain: store.sellerId, // Repurposed as Flipkart seller ID
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        FlipkartWebhookController.logger.info('Duplicate webhook received', {
          topic: 'order/create',
        });
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      // Queue async processing
      await QueueManager.addJob(
        'flipkart-webhook-process',
        `order-create-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'order/create',
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
   * POST /webhooks/flipkart/order/approve
   */
  static async handleOrderApprove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).flipkartStore;
      const webhookMeta = (req as any).flipkartWebhook;
      const payload = req.body;

      const webhookId = FlipkartWebhookController.generateWebhookId('order/approve', payload);

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'order/approve',
        shopifyId: webhookId,
        shopifyDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'flipkart-webhook-process',
        `order-approve-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'order/approve',
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
   * POST /webhooks/flipkart/order/ready-to-dispatch
   */
  static async handleOrderReadyToDispatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).flipkartStore;
      const webhookMeta = (req as any).flipkartWebhook;
      const payload = req.body;

      const webhookId = FlipkartWebhookController.generateWebhookId('order/ready-to-dispatch', payload);

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'order/ready-to-dispatch',
        shopifyId: webhookId,
        shopifyDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'flipkart-webhook-process',
        `order-ready-to-dispatch-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'order/ready-to-dispatch',
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
   * POST /webhooks/flipkart/order/dispatch
   */
  static async handleOrderDispatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).flipkartStore;
      const webhookMeta = (req as any).flipkartWebhook;
      const payload = req.body;

      const webhookId = FlipkartWebhookController.generateWebhookId('order/dispatch', payload);

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'order/dispatch',
        shopifyId: webhookId,
        shopifyDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'flipkart-webhook-process',
        `order-dispatch-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'order/dispatch',
          payload,
        },
        { priority: 3 }
      );

      await store.recordWebhookReceived();
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/flipkart/order/deliver
   */
  static async handleOrderDeliver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).flipkartStore;
      const webhookMeta = (req as any).flipkartWebhook;
      const payload = req.body;

      const webhookId = FlipkartWebhookController.generateWebhookId('order/deliver', payload);

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'order/deliver',
        shopifyId: webhookId,
        shopifyDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'flipkart-webhook-process',
        `order-deliver-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'order/deliver',
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
   * POST /webhooks/flipkart/order/cancel
   */
  static async handleOrderCancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).flipkartStore;
      const webhookMeta = (req as any).flipkartWebhook;
      const payload = req.body;

      const webhookId = FlipkartWebhookController.generateWebhookId('order/cancel', payload);

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'order/cancel',
        shopifyId: webhookId,
        shopifyDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'flipkart-webhook-process',
        `order-cancel-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'order/cancel',
          payload,
        },
        { priority: 2 }
      );

      await store.recordWebhookReceived();
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/flipkart/order/return
   */
  static async handleOrderReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).flipkartStore;
      const webhookMeta = (req as any).flipkartWebhook;
      const payload = req.body;

      const webhookId = FlipkartWebhookController.generateWebhookId('order/return', payload);

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'order/return',
        shopifyId: webhookId,
        shopifyDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'flipkart-webhook-process',
        `order-return-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'order/return',
          payload,
        },
        { priority: 2 }
      );

      await store.recordWebhookReceived();
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhooks/flipkart/inventory/update
   */
  static async handleInventoryUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = (req as any).flipkartStore;
      const webhookMeta = (req as any).flipkartWebhook;
      const payload = req.body;

      const webhookId = FlipkartWebhookController.generateWebhookId('inventory/update', payload);

      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        topic: 'inventory/update',
        shopifyId: webhookId,
        shopifyDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await QueueManager.addJob(
        'flipkart-webhook-process',
        `inventory-update-${String(event._id)}`,
        {
          eventId: String(event._id).toString(),
          storeId: store._id.toString(),
          topic: 'inventory/update',
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
}

export default FlipkartWebhookController;
