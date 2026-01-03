/**
 * Courier Provider Factory
 *
 * Singleton factory for instantiating courier provider instances
 * Supports multiple courier integrations (Velocity, Delhivery, DTDC, etc.)
 *
 * Usage:
 * ```typescript
 * const provider = await CourierFactory.getProvider('velocity-shipfast', companyId);
 * const shipment = await provider.createShipment(data);
 * ```
 */

import mongoose from 'mongoose';
import { ICourierAdapter } from '../../../../infrastructure/external/couriers/base/courier.adapter';
import { VelocityShipfastProvider } from '../../../../infrastructure/external/couriers/velocity';
import { Integration } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

export class CourierFactory {
  // Provider cache: Map<providerKey, providerInstance>
  // Key format: "${providerName}-${companyId}"
  private static providers = new Map<string, ICourierAdapter>();

  /**
   * Get or create a courier provider instance
   *
   * @param providerName - Provider identifier ('velocity-shipfast', 'delhivery', etc.)
   * @param companyId - Company MongoDB ObjectId
   * @returns Courier provider instance
   */
  static async getProvider(
    providerName: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<ICourierAdapter> {
    const providerKey = `${providerName}-${companyId.toString()}`;

    // Return cached provider if exists
    if (this.providers.has(providerKey)) {
      logger.debug('Returning cached courier provider', { providerName, companyId: companyId.toString() });
      return this.providers.get(providerKey)!;
    }

    // Verify integration exists and is active
    const integration = await Integration.findOne({
      companyId,
      type: 'courier',
      provider: providerName,
      'settings.isActive': true
    });

    if (!integration) {
      throw new Error(
        `Courier integration '${providerName}' not found or not active for company ${companyId}`
      );
    }

    // Create provider instance based on provider name
    let provider: ICourierAdapter;

    switch (providerName.toLowerCase()) {
      case 'velocity-shipfast':
      case 'velocity':
        provider = new VelocityShipfastProvider(companyId);
        break;

      // Future courier integrations:
      // case 'delhivery':
      //   provider = new DelhiveryProvider(companyId);
      //   break;
      //
      // case 'dtdc':
      //   provider = new DtdcProvider(companyId);
      //   break;
      //
      // case 'xpressbees':
      //   provider = new XpressbeesProvider(companyId);
      //   break;

      default:
        throw new Error(`Unknown courier provider: ${providerName}`);
    }

    // Cache the provider instance
    this.providers.set(providerKey, provider);

    logger.info('Courier provider instantiated', {
      providerName,
      companyId: companyId.toString()
    });

    return provider;
  }

  /**
   * Get all active courier providers for a company
   *
   * @param companyId - Company MongoDB ObjectId
   * @returns Array of provider instances
   */
  static async getAllProviders(companyId: mongoose.Types.ObjectId): Promise<ICourierAdapter[]> {
    const integrations = await Integration.find({
      companyId,
      type: 'courier',
      'settings.isActive': true
    });

    const providers: ICourierAdapter[] = [];

    for (const integration of integrations) {
      try {
        const provider = await this.getProvider(integration.provider, companyId);
        providers.push(provider);
      } catch (error) {
        logger.warn('Failed to load courier provider', {
          provider: integration.provider,
          companyId: companyId.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return providers;
  }

  /**
   * Clear provider cache for a specific company
   * Use when integration settings change
   *
   * @param companyId - Company MongoDB ObjectId
   * @param providerName - Optional: Clear specific provider only
   */
  static clearCache(companyId: mongoose.Types.ObjectId, providerName?: string): void {
    if (providerName) {
      const providerKey = `${providerName}-${companyId.toString()}`;
      this.providers.delete(providerKey);
      logger.debug('Cleared courier provider cache', { providerName, companyId: companyId.toString() });
    } else {
      // Clear all providers for this company
      const companyIdStr = companyId.toString();
      const keysToDelete: string[] = [];

      for (const [key] of this.providers) {
        if (key.endsWith(`-${companyIdStr}`)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.providers.delete(key));
      logger.debug('Cleared all courier provider cache for company', { companyId: companyIdStr });
    }
  }

  /**
   * Clear all provider cache (for testing)
   */
  static clearAllCache(): void {
    this.providers.clear();
    logger.debug('Cleared all courier provider cache');
  }

  /**
   * Check if a provider is available for a company
   *
   * @param providerName - Provider identifier
   * @param companyId - Company MongoDB ObjectId
   * @returns True if provider is configured and active
   */
  static async isProviderAvailable(
    providerName: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<boolean> {
    const integration = await Integration.findOne({
      companyId,
      type: 'courier',
      provider: providerName,
      'settings.isActive': true
    });

    return !!integration;
  }
}
