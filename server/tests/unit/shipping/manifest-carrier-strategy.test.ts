import { getManifestCarrierStrategy } from '../../../src/core/application/services/shipping/manifest-carrier-strategy';

describe('Manifest Carrier Strategy', () => {
    it('resolves Velocity to shipment-level pickup and no external manifest call', () => {
        const strategy = getManifestCarrierStrategy('velocity');
        expect(strategy.pickupMode).toBe('shipment');
        expect(strategy.externalManifestMode).toBe('none');
        expect(strategy.pickupTrigger).toBe('manifest_close');
    });

    it('resolves Delhivery to warehouse-level pickup and external manifest API', () => {
        const strategy = getManifestCarrierStrategy('delhivery');
        expect(strategy.pickupMode).toBe('warehouse');
        expect(strategy.externalManifestMode).toBe('api');
        expect(strategy.pickupTrigger).toBe('manifest_close');
    });

    it('resolves Ekart to no pickup scheduling and external manifest API', () => {
        const strategy = getManifestCarrierStrategy('ekart');
        expect(strategy.pickupMode).toBe('none');
        expect(strategy.externalManifestMode).toBe('api');
        expect(strategy.pickupTrigger).toBe('shipment_create');
    });

    it('falls back to safe defaults for unknown couriers', () => {
        const strategy = getManifestCarrierStrategy('unknown-provider');
        expect(strategy.pickupMode).toBe('none');
        expect(strategy.externalManifestMode).toBe('none');
        expect(strategy.pickupTrigger).toBe('shipment_create');
    });
});

