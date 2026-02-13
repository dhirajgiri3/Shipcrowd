import CourierProviderRegistry from '../courier/courier-provider-registry';

export type ManifestExternalMode = 'api' | 'none';
export type ManifestPickupMode = 'shipment' | 'warehouse' | 'none';

export interface ManifestCarrierStrategy {
    carrier: string;
    externalManifestMode: ManifestExternalMode;
    pickupMode: ManifestPickupMode;
    pickupTrigger: 'manifest_close' | 'shipment_create';
    notes: string;
}

const STRATEGIES: Record<string, Omit<ManifestCarrierStrategy, 'carrier'>> = {
    velocity: {
        externalManifestMode: 'none',
        pickupMode: 'shipment',
        pickupTrigger: 'manifest_close',
        notes: 'Pickup is triggered per provider shipment ID at manifest close',
    },
    delhivery: {
        externalManifestMode: 'api',
        pickupMode: 'warehouse',
        pickupTrigger: 'manifest_close',
        notes: 'Pickup request is warehouse-level against registered pickup location',
    },
    ekart: {
        externalManifestMode: 'api',
        pickupMode: 'none',
        pickupTrigger: 'shipment_create',
        notes: 'No dedicated pickup scheduling call in current adapter flow',
    },
    xpressbees: {
        externalManifestMode: 'none',
        pickupMode: 'none',
        pickupTrigger: 'shipment_create',
        notes: 'No explicit manifest/pickup adapter support configured',
    },
    india_post: {
        externalManifestMode: 'none',
        pickupMode: 'none',
        pickupTrigger: 'shipment_create',
        notes: 'No explicit manifest/pickup adapter support configured',
    },
};

const DEFAULT_STRATEGY: Omit<ManifestCarrierStrategy, 'carrier'> = {
    externalManifestMode: 'none',
    pickupMode: 'none',
    pickupTrigger: 'shipment_create',
    notes: 'Fallback behavior for unsupported courier',
};

export const getManifestCarrierStrategy = (carrier: string): ManifestCarrierStrategy => {
    const canonical = CourierProviderRegistry.toCanonical(carrier);
    const key = canonical || CourierProviderRegistry.normalize(carrier);
    const strategy = STRATEGIES[key] || DEFAULT_STRATEGY;

    return {
        carrier: key,
        ...strategy,
    };
};

