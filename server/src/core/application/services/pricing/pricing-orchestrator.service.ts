
import mongoose from 'mongoose';
import Company from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import logger from '../../../../shared/logger/winston.logger';
import { DynamicPricingService } from './dynamic-pricing.service';
import PricingAudit from '../../../../infrastructure/database/mongoose/models/finance/pricing-audit.model';
import { v4 as uuidv4 } from 'uuid';
import { RateCardSelectorService } from './rate-card-selector.service';

/**
 * Pricing Orchestrator Service
 *
 * Coordinates shipment pricing calculation by:
 * 1. Fetching company's assigned rate card
 * 2. Determining zone from pincodes
 * 3. Calculating base + weight + zone charges
 * 4. Applying discounts and COD charges
 * 5. Calculating GST
 *
 * Used during shipment creation to provide accurate pricing breakdown.
 */

export interface PricingInput {
  companyId: string;
  fromPincode: string;
  toPincode: string;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  paymentMode: 'prepaid' | 'cod';
  orderValue: number;
  carrier?: string;
  serviceType?: string;
  customerId?: string;
}

export interface PricingBreakdown {
  rateCardId: mongoose.Types.ObjectId;
  rateCardName: string;
  baseRate: number;
  weightCharge: number;
  zoneCharge: number;
  zone: string;
  customerDiscount: number;
  subtotal: number;
  codCharge: number;
  gstAmount: number;
  totalPrice: number;
  calculatedAt: Date;
  calculationMethod: 'ratecard' | 'fallback' | 'override';
}

export class PricingOrchestratorService {
  private static instance: PricingOrchestratorService;

  private constructor() { }

  public static getInstance(): PricingOrchestratorService {
    if (!PricingOrchestratorService.instance) {
      PricingOrchestratorService.instance = new PricingOrchestratorService();
    }
    return PricingOrchestratorService.instance;
  }

  /**
   * Calculate shipment pricing using company's rate card
   */
  async calculateShipmentPricing(input: PricingInput): Promise<PricingBreakdown> {
    try {
      // Step 1: Select the most appropriate rate card
      const selection = await RateCardSelectorService.selectRateCard({
        companyId: input.companyId,
        customerId: input.customerId,
      }).catch(err => {
        logger.warn(`[PricingOrchestrator] Rate card selection failed for company ${input.companyId}: ${err.message}`);
        return null;
      });

      if (!selection) {
        return this.getFallbackPricing(input);
      }

      // Delegate to DynamicPricingService for core calculation logic
      const pricingService = new DynamicPricingService();

      const pricingResult = await pricingService.calculatePricing({
        companyId: input.companyId,
        fromPincode: input.fromPincode,
        toPincode: input.toPincode,
        weight: input.weight,
        dimensions: input.dimensions,
        paymentMode: input.paymentMode,
        orderValue: input.orderValue,
        carrier: input.carrier,
        serviceType: input.serviceType,
        rateCardId: selection.rateCardId,
        customerId: input.customerId
      });

      // Async Audit Logging (Fire-and-Forget)
      this.logPricingAudit(input, pricingResult).catch(err =>
        logger.error('[PricingOrchestrator] Audit log failed', err)
      );

      return {
        rateCardId: new mongoose.Types.ObjectId(pricingResult.metadata.rateCardId),
        rateCardName: selection.rateCardName || 'Rate Card',
        baseRate: pricingResult.metadata.breakdown?.baseCharge || 0,
        weightCharge: pricingResult.metadata.breakdown?.weightCharge || 0,
        zoneCharge: pricingResult.metadata.breakdown?.zoneCharge || 0,
        zone: pricingResult.metadata.zone,
        customerDiscount: pricingResult.discount,
        subtotal: pricingResult.shipping, // Post-discount shipping cost
        codCharge: pricingResult.codCharge,
        gstAmount: pricingResult.tax.total,
        totalPrice: pricingResult.total,
        calculatedAt: new Date(),
        calculationMethod: pricingResult.metadata.cached ? 'ratecard' : 'ratecard'
      };
    } catch (error) {
      logger.error('[PricingOrchestrator] Calculation failed:', error);
      return this.getFallbackPricing(input);
    }
  }

  /**
   * Fallback pricing when no rate card is available
   */
  private getFallbackPricing(input: PricingInput): PricingBreakdown {
    const baseRate = 50; // Flat rate
    const weightCharge = input.weight * 20;
    const codCharge = input.paymentMode === 'cod' ? Math.max(input.orderValue * 0.02, 30) : 0;
    const subtotal = baseRate + weightCharge;
    const gstAmount = (subtotal + codCharge) * 0.18;
    const totalPrice = subtotal + codCharge + gstAmount;

    return {
      rateCardId: new mongoose.Types.ObjectId(),
      rateCardName: 'Fallback Rates',
      baseRate,
      weightCharge,
      zoneCharge: 0,
      zone: 'zoneA',
      customerDiscount: 0,
      subtotal,
      codCharge,
      gstAmount,
      totalPrice: Math.round(totalPrice * 100) / 100,
      calculatedAt: new Date(),
      calculationMethod: 'fallback'
    };
  }

  /**
   * Log pricing request/response to audit table
   * Fire-and-forget method
   */
  private async logPricingAudit(input: PricingInput, result: any): Promise<void> {
    try {
      await PricingAudit.create({
        requestId: uuidv4(),
        companyId: input.companyId,
        input: {
          fromPincode: input.fromPincode,
          toPincode: input.toPincode,
          weight: input.weight,
          paymentMode: input.paymentMode,
          orderValue: input.orderValue,
          carrier: input.carrier,
          serviceType: input.serviceType
        },
        resolvedZone: result.metadata.zone,
        zoneSource: result.metadata.zoneSource,
        rateCardId: result.metadata.rateCardId,
        breakdown: result.metadata.breakdown,
        price: result.total,
        pricingVersion: result.metadata.pricingVersion,
        metadata: {
          cached: result.metadata.cached,
          platform: 'web',
          pricingProvider: result.pricingProvider
        }
      });
    } catch (error) {
      logger.warn('[PricingOrchestrator] Failed to save audit log', error);
    }
  }
}

export default PricingOrchestratorService.getInstance();
