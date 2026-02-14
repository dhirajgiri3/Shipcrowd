/**
 * Base Webhook Handler Implementation
 * 
 * Provides common webhook handling logic with:
 * - Idempotency (deduplication)
 * - Status mapping integration
 * - Automatic shipment updates
 * - Business rule triggers
 */

import { Request } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Shipment } from '../../../../../infrastructure/database/mongoose/models/index';
import { StatusMapperService } from '../status-mappings/status-mapper.service';
import { ShipmentService } from '../../shipping/shipment.service';
import logger from '../../../../../shared/logger/winston.logger';
import {
    IWebhookHandler,
    WebhookPayload,
    WebhookConfig,
    VerificationStrategy
} from './webhook-handler.interface';

/**
 * Simple in-memory deduplication cache
 * TODO: Replace with Redis for production multi-instance deployments
 */
const processedWebhooks = new Map<string, number>();

/**
 * Base webhook handler with common functionality
 */
export abstract class BaseWebhookHandler implements IWebhookHandler {
    protected config: WebhookConfig;

    constructor(config: WebhookConfig) {
        this.config = config;
    }

    // ==================== Abstract Methods (Must Implement) ====================

    /**
     * Parse courier-specific payload - must be implemented by subclass
     */
    abstract parseWebhook(req: Request): WebhookPayload;

    // ==================== Signature Verification ====================

    /**
     * Verify webhook signature based on strategy
     */
    verifySignature(req: Request): boolean {
        switch (this.config.verificationStrategy) {
            case VerificationStrategy.HMAC_SHA256:
                return this.verifyHmacSignature(req);

            case VerificationStrategy.API_KEY:
                return this.verifyApiKey(req);

            case VerificationStrategy.IP_WHITELIST:
                return this.verifyIpWhitelist(req);

            case VerificationStrategy.NONE:
                logger.warn(`Webhook signature verification disabled for ${this.config.courier}`);
                return true;

            default:
                logger.error(`Unknown verification strategy: ${this.config.verificationStrategy}`);
                return false;
        }
    }

    /**
     * Verify HMAC SHA256 signature
     */
    protected verifyHmacSignature(req: Request): boolean {
        const signature = req.headers[this.config.signatureHeader || 'x-signature'] as string;
        const secret = this.config.secretKey;

        if (!signature || !secret) {
            logger.warn(`Missing signature or secret for ${this.config.courier} webhook`);
            return process.env.NODE_ENV === 'development'; // Allow in dev
        }

        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );

        if (!isValid) {
            logger.warn(`Invalid HMAC signature for ${this.config.courier} webhook`);
        }

        return isValid;
    }

    /**
     * Verify API key in header
     */
    protected verifyApiKey(req: Request): boolean {
        const apiKey = req.headers[this.config.apiKeyHeader || 'x-api-key'] as string;
        const expectedKey = this.config.secretKey;

        if (!expectedKey) {
            logger.warn(`API key not configured for ${this.config.courier}`);
            return process.env.NODE_ENV === 'development';
        }

        const isValid = apiKey === expectedKey;
        if (!isValid) {
            logger.warn(`Invalid API key for ${this.config.courier} webhook`);
        }

        return isValid;
    }

    /**
     * Verify IP whitelist
     */
    protected verifyIpWhitelist(req: Request): boolean {
        const clientIp = req.ip || req.connection.remoteAddress || '';
        const allowedIPs = this.config.allowedIPs || [];

        if (allowedIPs.length === 0) {
            logger.warn(`IP whitelist not configured for ${this.config.courier}`);
            return process.env.NODE_ENV === 'development';
        }

        const isAllowed = allowedIPs.includes(clientIp);
        if (!isAllowed) {
            logger.warn(`Webhook from unauthorized IP for ${this.config.courier}`, { clientIp });
        }

        return isAllowed;
    }

    // ==================== Idempotency ====================

    /**
     * Generate idempotency key (can be overridden)
     */
    getIdempotencyKey(payload: WebhookPayload): string {
        const key = `${payload.courier}-${payload.awb}-${payload.status}-${payload.timestamp.getTime()}`;
        return crypto.createHash('md5').update(key).digest('hex');
    }

    /**
     * Check if webhook was already processed
     */
    protected async checkDuplicate(idempotencyKey: string): Promise<boolean> {
        // Simple in-memory check
        // TODO: Replace with Redis for distributed systems
        return processedWebhooks.has(idempotencyKey);
    }

    /**
     * Mark webhook as processed
     */
    protected async markProcessed(idempotencyKey: string): Promise<void> {
        processedWebhooks.set(idempotencyKey, Date.now());

        // Cleanup after 24 hours
        setTimeout(() => {
            processedWebhooks.delete(idempotencyKey);
        }, 24 * 60 * 60 * 1000);
    }

    // ==================== Webhook Processing ====================

    /**
     * Handle webhook with idempotency, status mapping, and DB updates
     */
    async handleWebhook(payload: WebhookPayload): Promise<void> {
        const idempotencyKey = this.getIdempotencyKey(payload);

        // 1. Deduplication check
        const alreadyProcessed = await this.checkDuplicate(idempotencyKey);
        if (alreadyProcessed) {
            logger.info('Duplicate webhook ignored', {
                idempotencyKey,
                courier: payload.courier,
                awb: payload.awb
            });
            return;
        }

        // 2. Find shipment
        const shipment = await this.findShipment(payload.awb);
        if (!shipment) {
            logger.warn('Shipment not found for webhook', {
                courier: payload.courier,
                awb: payload.awb
            });
            await this.markProcessed(idempotencyKey); // Mark as processed to avoid retries
            return;
        }

        // 3. Map status using StatusMapperService
        const mapping = StatusMapperService.map(payload.courier, payload.status);
        const internalStatus = mapping.internalStatus;

        // Skip if status is unknown or same as current
        if (internalStatus === 'unknown') {
            logger.info('Unknown status ignored', {
                courier: payload.courier,
                awb: payload.awb,
                externalStatus: payload.status
            });
            await this.markProcessed(idempotencyKey);
            return;
        }

        if (shipment.currentStatus === internalStatus) {
            logger.debug('Status already up to date', {
                courier: payload.courier,
                awb: payload.awb,
                status: internalStatus
            });
            await this.markProcessed(idempotencyKey);
            return;
        }

        // 4. Update shipment status
        await this.updateShipmentStatus(shipment, payload, mapping);

        // 5. Mark as processed
        await this.markProcessed(idempotencyKey);

        // 6. Trigger business rules
        await this.triggerBusinessRules(shipment, payload, mapping);

        logger.info('Webhook processed successfully', {
            courier: payload.courier,
            awb: payload.awb,
            oldStatus: shipment.currentStatus,
            newStatus: internalStatus
        });
    }

    /**
     * Find shipment by AWB
     */
    protected async findShipment(awb: string): Promise<any | null> {
        return await Shipment.findOne({
            $or: [
                { trackingNumber: awb },
                { 'carrierDetails.carrierTrackingNumber': awb }
            ]
        });
    }

    /**
     * Update shipment status in database
     */
    protected async updateShipmentStatus(
        shipment: any,
        payload: WebhookPayload,
        mapping: any
    ): Promise<void> {
        const updateResult = await ShipmentService.updateShipmentStatus({
            shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
            currentStatus: shipment.currentStatus,
            newStatus: mapping.internalStatus,
            currentVersion: shipment.__v || 0,
            userId: 'SYSTEM_WEBHOOK',
            location: payload.metadata.location || '',
            description: payload.metadata.description || `${payload.courier} update: ${payload.status}`
        });

        if (!updateResult.success) {
            throw new Error(`Failed to update shipment: ${updateResult.error}`);
        }
    }

    /**
     * Trigger business rules based on status change
     * Can be overridden by subclasses for courier-specific logic
     */
    protected async triggerBusinessRules(
        shipment: any,
        payload: WebhookPayload,
        mapping: any
    ): Promise<void> {
        // Trigger NDR detection if status indicates generic failure
        if (mapping.internalStatus === 'ndr' || mapping.statusCategory === 'exception') {
            await this.triggerNDRDetection(payload);
        }

        if (mapping.internalStatus === 'delivered' && shipment?.paymentDetails?.type === 'cod') {
            await this.triggerCODReconciliation(shipment, payload);
        }

        logger.debug('Business rules triggered', {
            courier: payload.courier,
            awb: payload.awb,
            status: mapping.internalStatus,
            category: mapping.statusCategory
        });
    }

    /**
     * Trigger NDR detection process
     */
    protected async triggerNDRDetection(payload: WebhookPayload): Promise<void> {
        const patterns = this.getNDRPatterns ? this.getNDRPatterns() : null;

        // If handler provides patterns, check if this is an NDR
        if (patterns) {
            const isNDR = this.isNDRStatus(
                payload.status,
                payload.metadata?.instructions || payload.metadata?.description,
                patterns
            );

            if (!isNDR) return;
        }

        try {
            // Lazy load service to avoid circular dependencies
            const { default: NDRDetectionService } = await import('../../ndr/ndr-detection.service');

            await NDRDetectionService.handleWebhookNDRDetection({
                carrier: payload.courier,
                awb: payload.awb,
                status: payload.status,
                remarks: payload.metadata?.instructions || payload.metadata?.description,
                timestamp: payload.timestamp
            });
        } catch (error) {
            logger.error('Failed to trigger NDR detection from webhook', {
                courier: payload.courier,
                awb: payload.awb,
                error
            });
        }
    }

    /**
     * Trigger COD reconciliation for delivered COD shipments.
     * Falls back to expected amount when courier payload does not include collection amount.
     */
    protected async triggerCODReconciliation(shipment: any, payload: WebhookPayload): Promise<void> {
        try {
            const metadata: Record<string, any> = payload.metadata || {};
            const courierCollectedCandidates = [
                metadata.codAmount,
                metadata.cod_amount,
                metadata.collectedAmount,
                metadata.collectionAmount,
            ];

            let collectedAmount = courierCollectedCandidates
                .map((value) => Number(value))
                .find((value) => Number.isFinite(value) && value >= 0);

            if (collectedAmount === undefined) {
                collectedAmount = Number(
                    shipment?.paymentDetails?.totalCollection ??
                        shipment?.paymentDetails?.codAmount ??
                        0
                );
            }

            const { CODReconciliationService } = await import('../../finance/cod-reconciliation.service');
            await CODReconciliationService.reconcileDeliveredShipment(
                (shipment._id as mongoose.Types.ObjectId).toString(),
                {
                    collectedAmount,
                    collectionMethod: metadata.paymentMode || metadata.collectionMethod,
                    deliveredAt: payload.timestamp || new Date(),
                    source: 'webhook',
                }
            );
        } catch (error) {
            logger.error('Failed to trigger COD reconciliation from webhook', {
                courier: payload.courier,
                awb: payload.awb,
                error,
            });
        }
    }

    /**
     * Check if status/remarks match NDR patterns
     */
    protected isNDRStatus(
        status: string,
        remarks: string | undefined,
        patterns: { statusCodes: string[]; keywords: string[] }
    ): boolean {
        const normalizedStatus = status.toUpperCase();

        // Check status codes
        if (patterns.statusCodes.some(code => normalizedStatus.includes(code.toUpperCase()))) {
            return true;
        }

        // Check keywords in remarks
        if (remarks && patterns.keywords.length > 0) {
            const normalizedRemarks = remarks.toLowerCase();
            return patterns.keywords.some(keyword => normalizedRemarks.includes(keyword.toLowerCase()));
        }

        return false;
    }

    /**
     * Get generic NDR patterns - to be implemented by subclasses
     * Returns generic patterns if not overridden
     */
    protected getNDRPatterns?(): { statusCodes: string[]; keywords: string[] };
}
