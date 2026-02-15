import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { WebhookEvent } from '../../../../../infrastructure/database/mongoose/models';
import QueueManager from '../../../../../infrastructure/utilities/queue-manager';
import logger from '../../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';

/**
 * FlipkartWebhookController
 *
 * Handles incoming Flipkart webhooks.
 *
 * Pattern:
 * 1. Persist webhook event for duplicate prevention
 * 2. Queue async processing
 * 3. Return 200 immediately (within 5 seconds)
 *
 * All endpoints are public but HMAC-verified via middleware.
 *
 * Duplicate Prevention:
 * - Uses deterministic event ID based on topic + orderId (not time-based)
 * - platform + eventId composite unique index prevents duplicate processing
 */

export class FlipkartWebhookController {

  /**
   * Generate deterministic webhook ID from payload (NO timestamp)
   * This ensures the same payload produces the same ID for duplicate detection
   */
  private static generateWebhookId(topic: string, payload: any): string {
    // Extract order ID or resource ID from payload
    const resourceId = payload.orderId || payload.order_id || payload.id || 'unknown';

    // Create deterministic hash (NO Date.now())
    const hash = crypto.createHash('sha256');
    hash.update(topic);
    hash.update(String(resourceId));
    // Optionally include order status to allow multiple webhooks for same order
    if (payload.status) {
      hash.update(String(payload.status));
    }

    return `flipkart-${topic.replace(/\//g, '-')}-${resourceId}-${hash.digest('hex').substring(0, 16)}`;
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

      // Persist webhook event with platform field
      const { event, isDuplicate } = await WebhookEvent.createEvent({
        storeId: store._id,
        companyId: store.companyId,
        platform: 'flipkart',
        topic: 'order/create',
        eventId: webhookId,
        platformDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        logger.info('Duplicate webhook received', {
          topic: 'order/create',
        });
        sendSuccess(res, { received: true, duplicate: true });
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
      sendSuccess(res, { received: true });
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
        platform: 'flipkart',
        topic: 'order/approve',
        eventId: webhookId,
        platformDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        sendSuccess(res, { received: true, duplicate: true });
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
      sendSuccess(res, { received: true });
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
        platform: 'flipkart',
        topic: 'order/ready-to-dispatch',
        eventId: webhookId,
        platformDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        sendSuccess(res, { received: true, duplicate: true });
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
      sendSuccess(res, { received: true });
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
        platform: 'flipkart',
        topic: 'order/dispatch',
        eventId: webhookId,
        platformDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        sendSuccess(res, { received: true, duplicate: true });
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
      sendSuccess(res, { received: true });
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
        platform: 'flipkart',
        topic: 'order/deliver',
        eventId: webhookId,
        platformDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        sendSuccess(res, { received: true, duplicate: true });
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
      sendSuccess(res, { received: true });
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
        platform: 'flipkart',
        topic: 'order/cancel',
        eventId: webhookId,
        platformDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        sendSuccess(res, { received: true, duplicate: true });
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
      sendSuccess(res, { received: true });
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
        platform: 'flipkart',
        topic: 'order/return',
        eventId: webhookId,
        platformDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        sendSuccess(res, { received: true, duplicate: true });
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
      sendSuccess(res, { received: true });
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
        platform: 'flipkart',
        topic: 'inventory/update',
        eventId: webhookId,
        platformDomain: store.sellerId,
        payload,
        headers: req.headers as Record<string, string>,
        verified: webhookMeta?.verified ?? true,
        hmacValid: true,
      });

      if (isDuplicate) {
        sendSuccess(res, { received: true, duplicate: true });
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
      sendSuccess(res, { received: true });
    } catch (error) {
      next(error);
    }
  }
}

export default FlipkartWebhookController;
