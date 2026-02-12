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
import { DelhiveryProvider } from '../../../../infrastructure/external/couriers/delhivery';
import { EkartProvider } from '../../../../infrastructure/external/couriers/ekart/ekart.provider';
import { Integration } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

type CourierProviderBuilder = (companyId: mongoose.Types.ObjectId) => ICourierAdapter;

export class CourierFactory {
  // Provider cache: Map<providerKey, providerInstance>
  // Key format: "${providerName}-${companyId}"
  private static providers = new Map<string, ICourierAdapter>();
  private static providerBuilders = new Map<string, CourierProviderBuilder>([
    ['velocity-shipfast', (companyId) => new VelocityShipfastProvider(companyId)],
    ['velocity', (companyId) => new VelocityShipfastProvider(companyId)],
    ['delhivery', (companyId) => new DelhiveryProvider(companyId)],
    ['ekart', (companyId) => new EkartProvider(companyId)],
  ]);

  static registerProvider(providerName: string, builder: CourierProviderBuilder): void {
    this.providerBuilders.set(providerName.toLowerCase(), builder);
  }

  private static resolveProviderAliases(providerName: string): string[] {
    const normalized = providerName.toLowerCase();
    if (normalized === 'velocity' || normalized === 'velocity-shipfast') {
      return ['velocity', 'velocity-shipfast'];
    }
    return [normalized];
  }

  private static buildProviderMatch(providerName: string): Record<string, unknown> {
    const aliases = this.resolveProviderAliases(providerName);
    if (aliases.length === 1) {
      return { provider: aliases[0] };
    }
    return { $or: aliases.map((provider) => ({ provider })) };
  }

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

    // Verify integration exists and is active.
    // Use raw collection query to avoid decrypting credentials when we only need existence.
    const integration = await Integration.collection.findOne({
      companyId,
      type: 'courier',
      ...this.buildProviderMatch(providerName),
      'settings.isActive': true
    });

    if (!integration) {
      throw new NotFoundError(
        `Courier integration '${providerName}' not found or not active for company ${companyId}`,
        ErrorCode.BIZ_NOT_FOUND
      );
    }

    const providerBuilder = this.providerBuilders.get(providerName.toLowerCase());
    if (!providerBuilder) {
      throw new ValidationError(`Unknown courier provider: ${providerName}`);
    }
    const provider = providerBuilder(companyId);

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
    // Use raw collection query to avoid decrypting credentials for listing.
    const integrations = await Integration.collection.find({
      companyId,
      type: 'courier',
      'settings.isActive': true
    }).project({ provider: 1 }).toArray();

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
    // Use raw collection query to avoid decrypting credentials for availability checks.
    const integration = await Integration.collection.findOne({
      companyId,
      type: 'courier',
      ...this.buildProviderMatch(providerName),
      'settings.isActive': true
    });

    return !!integration;
  }
}
