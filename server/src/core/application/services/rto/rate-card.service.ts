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
import PincodeLookupService from '../logistics/pincode-lookup.service';

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

    // 1. Resolve zone key
    const zoneKey = this.resolveZoneKey(input, rateCard);
    const zonePricing = rateCard.zonePricing?.[zoneKey];
    if (!zonePricing) {
      throw new Error(`Zone pricing not configured for ${zoneKey || 'unknown zone'}`);
    }

    // 2. Calculate base + additional weight charges
    basePrice = zonePricing.basePrice;
    const additionalWeight = Math.max(0, input.weight - zonePricing.baseWeight);
    weightCharge = additionalWeight * zonePricing.additionalPricePerKg;
    breakdown.baseRate = basePrice;
    breakdown.weightRate = zonePricing.additionalPricePerKg;

    // 3. Zone charge (not used in zone pricing model)
    zoneCharge = 0;
    breakdown.zoneAdditional = 0;

    // 4. Calculate subtotal before discount
    let subtotal = basePrice + weightCharge + zoneCharge;

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

  private static resolveZoneKey(input: RateCalculationInput, rateCard: any): string {
    if (input.zoneId) {
      const normalized = input.zoneId.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const letter = normalized.startsWith('zone')
        ? normalized.replace('zone', '').toUpperCase()
        : normalized.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(letter)) {
        return `zone${letter}`;
      }
    }

    if (input.originPincode && input.destinationPincode) {
      try {
        const zoneBType = rateCard.zoneBType || 'state';
        const zoneInfo = PincodeLookupService.getZoneFromPincodes(
          input.originPincode,
          input.destinationPincode,
          zoneBType
        );
        return zoneInfo.zone;
      } catch (error) {
        logger.warn('Failed to resolve zone from pincodes, defaulting to zoneD', {
          origin: input.originPincode,
          destination: input.destinationPincode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return 'zoneD';
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

    const zonePricing = rateCard.zonePricing || {};
    const requiredZones = ['zoneA', 'zoneB', 'zoneC', 'zoneD', 'zoneE'];

    if (!Object.keys(zonePricing).length) {
      errors.push('Rate card must have zone pricing configured');
    }

    for (const zoneKey of requiredZones) {
      const zoneData = zonePricing[zoneKey];
      if (!zoneData) {
        errors.push(`Missing pricing for ${zoneKey}`);
        continue;
      }
      if (zoneData.baseWeight < 0 || zoneData.basePrice < 0 || zoneData.additionalPricePerKg < 0) {
        errors.push(`Invalid pricing values for ${zoneKey}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
