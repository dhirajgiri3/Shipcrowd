/**
 * Rate Card Service
 *
 * Purpose: Calculate shipping and RTO charges dynamically based on rate cards
 *
 * DEPENDENCIES:
 * - RateCard Model, Logger
 *
 * TESTING:
 * Unit Tests: tests/unit/services/rto/rate-card.service.test.ts
 * Coverage: TBD
 *
 * Phase 5 Implementation: Dynamic RTO charge calculation
 */

import mongoose from 'mongoose';
import logger from '../../../../shared/logger/winston.logger';
import RateCard from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model';

interface RateCalculationInput {
  companyId: string;
  carrier?: string;
  serviceType?: string;
  weight: number;
  originPincode?: string;
  destinationPincode?: string;
  zoneId?: string;
  customerId?: string;
  customerGroup?: string;
}

interface RateCalculationResult {
  basePrice: number;
  weightCharge: number;
  zoneCharge: number;
  discount: number;
  finalPrice: number;
  currency: string;
  rateCardUsed?: string;
  breakdown?: {
    baseRate?: number;
    weightRate?: number;
    zoneAdditional?: number;
    zoneMultiplier?: number;
    discountPercentage?: number;
    flatDiscount?: number;
  };
}

export default class RateCardService {
  /**
   * Calculate RTO charges dynamically based on rate card
   *
   * Falls back to flat rate if no rate card configured or calculation fails.
   */
  static async calculateRTOCharges(input: RateCalculationInput): Promise<RateCalculationResult> {
    try {
      logger.debug('Calculating RTO charges', {
        companyId: input.companyId,
        carrier: input.carrier,
        weight: input.weight
      });

      // Get active rate card for company
      const rateCard = await RateCard.findOne({
        companyId: new mongoose.Types.ObjectId(input.companyId),
        status: 'active',
        isDeleted: false,
        'effectiveDates.startDate': { $lte: new Date() },
        $or: [
          { 'effectiveDates.endDate': { $gte: new Date() } },
          { 'effectiveDates.endDate': null }
        ]
      }).sort({ version: -1 }); // Get latest version

      if (!rateCard) {
        // Fallback to flat rate from environment variable
        const flatRate = Number(process.env.RTO_FLAT_CHARGE) || 50;
        logger.info('No active rate card found, using flat rate', {
          companyId: input.companyId,
          flatRate
        });

        return {
          basePrice: flatRate,
          weightCharge: 0,
          zoneCharge: 0,
          discount: 0,
          finalPrice: flatRate,
          currency: 'INR',
          breakdown: {
            baseRate: flatRate
          }
        };
      }

      // Calculate charges based on rate card
      const calculation = this.calculateFromRateCard(rateCard, input);

      logger.info('RTO charges calculated from rate card', {
        companyId: input.companyId,
        rateCardName: rateCard.name,
        finalPrice: calculation.finalPrice
      });

      return {
        ...calculation,
        rateCardUsed: rateCard.name
      };

    } catch (error) {
      logger.error('Error calculating RTO charges, using fallback', {
        companyId: input.companyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Final fallback
      const flatRate = Number(process.env.RTO_FLAT_CHARGE) || 50;
      return {
        basePrice: flatRate,
        weightCharge: 0,
        zoneCharge: 0,
        discount: 0,
        finalPrice: flatRate,
        currency: 'INR'
      };
    }
  }

  /**
   * Calculate charges from rate card rules
   */
  private static calculateFromRateCard(
    rateCard: any,
    input: RateCalculationInput
  ): RateCalculationResult {
    let basePrice = 0;
    let weightCharge = 0;
    let zoneCharge = 0;
    let discount = 0;

    const breakdown: RateCalculationResult['breakdown'] = {};

    // 1. Find applicable base rate
    const baseRate = rateCard.baseRates.find((rate: any) => {
      const carrierMatch = !input.carrier || rate.carrier === input.carrier;
      const serviceMatch = !input.serviceType || rate.serviceType === input.serviceType;
      const weightMatch = input.weight >= rate.minWeight && input.weight <= rate.maxWeight;
      return carrierMatch && serviceMatch && weightMatch;
    });

    if (baseRate) {
      basePrice = baseRate.basePrice;
      breakdown.baseRate = baseRate.basePrice;
    } else {
      // Fallback: Use first base rate or default
      basePrice = rateCard.baseRates[0]?.basePrice || 50;
      breakdown.baseRate = basePrice;
    }

    // 2. Calculate weight-based charges
    const weightRule = rateCard.weightRules.find((rule: any) => {
      const weightMatch = input.weight >= rule.minWeight && input.weight <= rule.maxWeight;
      const carrierMatch = !rule.carrier || !input.carrier || rule.carrier === input.carrier;
      const serviceMatch = !rule.serviceType || !input.serviceType || rule.serviceType === input.serviceType;
      return weightMatch && carrierMatch && serviceMatch;
    });

    if (weightRule) {
      weightCharge = input.weight * weightRule.pricePerKg;
      breakdown.weightRate = weightRule.pricePerKg;
    }

    // 3. Apply zone-based charges
    if (input.zoneId) {
      const zoneRule = rateCard.zoneRules.find((rule: any) => {
        return rule.zoneId.toString() === input.zoneId;
      });

      if (zoneRule) {
        zoneCharge = zoneRule.additionalPrice;
        breakdown.zoneAdditional = zoneRule.additionalPrice;
      }
    }

    // 4. Apply zone multipliers (if any)
    let zoneMultiplier = 1;
    if (input.zoneId && rateCard.zoneMultipliers) {
      const multiplier = rateCard.zoneMultipliers.get(input.zoneId);
      if (multiplier) {
        zoneMultiplier = multiplier;
        breakdown.zoneMultiplier = multiplier;
      }
    }

    // 5. Calculate subtotal before discount
    let subtotal = (basePrice + weightCharge + zoneCharge) * zoneMultiplier;

    // 6. Apply customer-specific discounts
    const customerOverride = rateCard.customerOverrides.find((override: any) => {
      const customerMatch = override.customerId?.toString() === input.customerId;
      const groupMatch = override.customerGroup === input.customerGroup;
      const carrierMatch = !override.carrier || !input.carrier || override.carrier === input.carrier;
      const serviceMatch = !override.serviceType || !input.serviceType || override.serviceType === input.serviceType;
      return (customerMatch || groupMatch) && carrierMatch && serviceMatch;
    });

    if (customerOverride) {
      if (customerOverride.discountPercentage) {
        discount = (subtotal * customerOverride.discountPercentage) / 100;
        breakdown.discountPercentage = customerOverride.discountPercentage;
      } else if (customerOverride.flatDiscount) {
        discount = customerOverride.flatDiscount;
        breakdown.flatDiscount = customerOverride.flatDiscount;
      }
    }

    // 7. Calculate final price
    const finalPrice = Math.max(0, subtotal - discount);

    return {
      basePrice,
      weightCharge,
      zoneCharge,
      discount,
      finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
      currency: 'INR',
      breakdown
    };
  }

  /**
   * Calculate forward shipment charges
   * (Can be extended for forward shipment pricing)
   */
  static async calculateShippingCharges(input: RateCalculationInput): Promise<RateCalculationResult> {
    // Same logic as RTO charges, but could have different rules in future
    return this.calculateRTOCharges(input);
  }

  /**
   * Get active rate card for a company
   */
  static async getActiveRateCard(companyId: string): Promise<any | null> {
    try {
      return await RateCard.findOne({
        companyId: new mongoose.Types.ObjectId(companyId),
        status: 'active',
        isDeleted: false,
        'effectiveDates.startDate': { $lte: new Date() },
        $or: [
          { 'effectiveDates.endDate': { $gte: new Date() } },
          { 'effectiveDates.endDate': null }
        ]
      }).sort({ version: -1 });
    } catch (error) {
      logger.error('Error fetching active rate card', {
        companyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Validate if rate card configuration is complete
   */
  static validateRateCard(rateCard: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rateCard.baseRates || rateCard.baseRates.length === 0) {
      errors.push('Rate card must have at least one base rate');
    }

    if (rateCard.baseRates) {
      for (const rate of rateCard.baseRates) {
        if (rate.minWeight > rate.maxWeight) {
          errors.push(`Invalid weight range for ${rate.carrier}/${rate.serviceType}`);
        }
      }
    }

    if (rateCard.weightRules) {
      for (const rule of rateCard.weightRules) {
        if (rule.minWeight > rule.maxWeight) {
          errors.push('Invalid weight range in weight rules');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
