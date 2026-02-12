/**
 * Legacy compatibility service name kept for runtime stability.
 *
 * NOTE:
 * - This service no longer reads the legacy pricing card model.
 * - RTO pricing is derived from explicit defaults + shipment context.
 * - Historical rate-card dependencies are intentionally removed.
 */

import logger from '../../../../shared/logger/winston.logger';
import PincodeLookupService from '../logistics/pincode-lookup.service';

interface RateCalculationInput {
  companyId: string;
  carrier?: string;
  serviceType?: string;
  weight: number;
  originPincode?: string;
  destinationPincode?: string;
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
  };
}

const ZONE_SURCHARGE: Record<string, number> = {
  zoneA: 0,
  zoneB: 10,
  zoneC: 20,
  zoneD: 30,
  zoneE: 45,
};

export default class ServiceRatePricingService {
  /**
   * Calculate RTO charges from service-level defaults.
   * This intentionally avoids legacy pricing-card reads.
   */
  static async calculateRTOCharges(input: RateCalculationInput): Promise<RateCalculationResult> {
    try {
      const baseRate = Number(process.env.RTO_FLAT_CHARGE || 50);
      const additionalPerKg = Number(process.env.RTO_ADDITIONAL_PER_KG || 20);
      const weight = Math.max(0.1, Number(input.weight || 0.5));
      const extraWeight = Math.max(0, weight - 0.5);
      const weightCharge = Math.round(extraWeight * additionalPerKg * 100) / 100;

      const zoneKey = this.resolveZone(input.originPincode, input.destinationPincode);
      const zoneCharge = ZONE_SURCHARGE[zoneKey] ?? ZONE_SURCHARGE.zoneD;

      const finalPrice = Math.round((baseRate + weightCharge + zoneCharge) * 100) / 100;

      return {
        basePrice: baseRate,
        weightCharge,
        zoneCharge,
        discount: 0,
        finalPrice,
        currency: 'INR',
        rateCardUsed: 'service-level-default',
        breakdown: {
          baseRate,
          weightRate: additionalPerKg,
          zoneAdditional: zoneCharge,
        },
      };
    } catch (error) {
      logger.error('Error calculating RTO charges, using hard fallback', {
        companyId: input.companyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const fallback = Number(process.env.RTO_FLAT_CHARGE || 50);
      return {
        basePrice: fallback,
        weightCharge: 0,
        zoneCharge: 0,
        discount: 0,
        finalPrice: fallback,
        currency: 'INR',
        rateCardUsed: 'service-level-fallback',
      };
    }
  }

  static async calculateShippingCharges(input: RateCalculationInput): Promise<RateCalculationResult> {
    return this.calculateRTOCharges(input);
  }

  /**
   * Kept for compatibility where callers expect this method.
   */
  static async getActivePricingCard(_companyId: string): Promise<null> {
    return null;
  }

  /**
   * Kept for compatibility where callers expect this method.
   */
  static validatePricingCard(_pricingCard: any): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  private static resolveZone(originPincode?: string, destinationPincode?: string): string {
    if (!originPincode || !destinationPincode) {
      return 'zoneD';
    }

    try {
      const zoneInfo = PincodeLookupService.getZoneFromPincodes(
        originPincode,
        destinationPincode,
        'state'
      );
      return zoneInfo.zone || 'zoneD';
    } catch {
      return 'zoneD';
    }
  }
}
