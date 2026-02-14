import { CARRIERS } from '../../../../infrastructure/database/seeders/data/carrier-data';
import CourierProviderRegistry from '../courier/courier-provider-registry';

/** Service types that are NOT courier providers (surface, express, etc.) */
const SERVICE_TYPES = new Set(['surface', 'express', 'air', 'standard', 'economy', 'ground', 'road']);

/**
 * Carrier Normalization Service
 *
 * Responsible for canonicalizing carrier names and service types
 * to ensure consistent lookups in the Rate Card system.
 */
export class CarrierNormalizationService {

    /**
     * Check if a value is a service type (surface, express, etc.) rather than a courier provider.
     * Used to handle legacy/bad data where carrier was incorrectly set to service type.
     */
    static isServiceType(value: string): boolean {
        return SERVICE_TYPES.has(String(value || '').toLowerCase());
    }

    /**
     * Resolve carrier to a valid provider for CourierFactory.
     * If carrier is a service type, returns fallback (velocity) or null to skip carrier-specific logic.
     */
    static resolveCarrierForProviderLookup(carrier: string): string | null {
        if (!carrier) return null;
        const canonical = CourierProviderRegistry.toCanonical(carrier);
        if (canonical) return CourierProviderRegistry.getIntegrationProvider(canonical);
        if (this.isServiceType(carrier)) return 'velocity'; // Fallback for bad data
        return null;
    }

    /**
     * Normalize carrier name to canonical ID
     * e.g. "Delhivery Surface" -> "delhivery"
     * e.g. "Blue Dart" -> "bluedart"
     */
    static normalizeCarrier(carrier: string): string {
        if (!carrier) return '';

        const supportedProvider = CourierProviderRegistry.toCanonical(carrier);
        if (supportedProvider) {
            return supportedProvider;
        }

        let normalized = carrier.trim().toLowerCase();

        // Common aliases mapping
        const aliases: Record<string, string> = {
            'blue dart': 'bluedart',
            'india post': 'indiapost',
            'india_post': 'indiapost',
            'e-kart': 'ekart',
            'xpress bees': 'xpressbees',
            'xpress_bees': 'xpressbees',
            'dtcd': 'dtdc'
        };

        if (aliases[normalized]) {
            normalized = aliases[normalized];
        }

        // Remove special chars for consistency (optional, but safer)
        // keeping it simple: just lowercase and trim for now unless we see detailed requirements
        return normalized;
    }

    static readonly ServiceTypeRegistry = {
        STANDARD: 'standard', // Road/Surface
        EXPRESS: 'express',   // Air/Fast
        ECONOMY: 'economy',
        HYPERLOCAL: 'hyperlocal',
        SAME_DAY: 'same_day'
    };

    /**
     * Normalize service type to canonical code
     * e.g. "Express Air" -> "express"
     */
    static normalizeServiceType(serviceType: string): string {
        if (!serviceType) return 'standard';

        let normalized = serviceType.trim().toLowerCase();

        // Alias mapping
        const aliases: Record<string, string> = {
            'air': 'express',
            'fast': 'express',
            'priority': 'express',
            'premium': 'express',

            'surface': 'standard',
            'ground': 'standard',
            'road': 'standard',
            'deferred': 'economy'
        };

        if (aliases[normalized]) {
            normalized = aliases[normalized];
        }

        return normalized;
    }

    /**
     * Generate unique key for grouping logic
     * Format: "carrier:serviceType"
     */
    static getCanonicalKey(carrier: string, serviceType: string): string {
        const c = this.normalizeCarrier(carrier) || 'any';
        const s = this.normalizeServiceType(serviceType) || 'any';
        return `${c}:${s}`;
    }
}

export default CarrierNormalizationService;
