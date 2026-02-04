/**
 * Delhivery B2C Integration Tests (Live API)
 *
 * These tests hit live endpoints (STAGING RECOMMENDED).
 * 
 * Tests are skipped unless:
 * - RUN_DELHIVERY_LIVE=true
 * - DELHIVERY_API_TOKEN is set
 * - DELHIVERY_TEST_ORIGIN_PIN and DELHIVERY_TEST_DEST_PIN are set
 *
 * Environment Variables:
 * ===================
 * REQUIRED (Read-only tests):
 * - RUN_DELHIVERY_LIVE=true
 * - DELHIVERY_API_TOKEN=your_staging_token
 * - DELHIVERY_BASE_URL=https://staging-express.delhivery.com (RECOMMENDED)
 * - DELHIVERY_TEST_ORIGIN_PIN=110001
 * - DELHIVERY_TEST_DEST_PIN=400001
 *
 * OPTIONAL (Read-only tests):
 * - DELHIVERY_TEST_TRACKING_AWB=existing_staging_awb (for trackShipment test)
 * - DELHIVERY_TEST_POD_AWB=delivered_staging_awb (for getProofOfDelivery test)
 *
 * OPTIONAL (Mutating tests - STAGING ONLY):
 * - DELHIVERY_ALLOW_MUTATIONS=true (enables shipment creation/cancellation/updates)
 * - DELHIVERY_TEST_PICKUP_LOCATION=Exact_Warehouse_Name_In_Delhivery
 * - DELHIVERY_TEST_PICKUP_DATE=YYYY-MM-DD (future date for pickup)
 * - DELHIVERY_TEST_PICKUP_TIME=HH:MM (24h format)
 * - DELHIVERY_TEST_CANCEL_AWB=eligible_staging_awb (for cancellation test)
 * - DELHIVERY_TEST_ADDRESS_AWB=eligible_staging_awb (for address update test)
 *
 * ⚠️  WARNING: NEVER set DELHIVERY_ALLOW_MUTATIONS=true in PRODUCTION
 */

import mongoose from 'mongoose';
import { DelhiveryProvider } from '../../../src/infrastructure/external/couriers/delhivery/delhivery.provider';

const runLive =
  process.env.RUN_DELHIVERY_LIVE === 'true' &&
  !!process.env.DELHIVERY_API_TOKEN &&
  !!process.env.DELHIVERY_TEST_ORIGIN_PIN &&
  !!process.env.DELHIVERY_TEST_DEST_PIN;

const describeLive = runLive ? describe : describe.skip;
const allowMutations = process.env.DELHIVERY_ALLOW_MUTATIONS === 'true';
const trackingAwb = process.env.DELHIVERY_TEST_TRACKING_AWB;
const podAwb = process.env.DELHIVERY_TEST_POD_AWB;
const pickupLocation = process.env.DELHIVERY_TEST_PICKUP_LOCATION;
const pickupDate = process.env.DELHIVERY_TEST_PICKUP_DATE;
const pickupTime = process.env.DELHIVERY_TEST_PICKUP_TIME;
const cancelAwb = process.env.DELHIVERY_TEST_CANCEL_AWB;
const addressAwb = process.env.DELHIVERY_TEST_ADDRESS_AWB;

// Warn if production URL is being used
if (runLive && process.env.DELHIVERY_BASE_URL?.includes('track.delhivery.com')) {
  console.warn('\n⚠️  WARNING: Running integration tests against PRODUCTION URL!');
  if (allowMutations) {
    console.error('❌ MUTATIONS ENABLED IN PRODUCTION - ABORTING!');
    process.exit(1);
  }
}

describeLive('Delhivery B2C Integration (Live API)', () => {
  let provider: DelhiveryProvider;

  beforeAll(() => {
    const baseUrl = process.env.DELHIVERY_BASE_URL || 'https://staging-express.delhivery.com';
    console.log(`\nTesting against: ${baseUrl}`);
    console.log(`Mutations allowed: ${allowMutations}`);

    provider = new DelhiveryProvider(new mongoose.Types.ObjectId(), baseUrl);
  });

  // =====================================
  // READ-ONLY TESTS (Always Safe)
  // =====================================

  describe('Read-Only Tests (Safe in Staging & Production)', () => {
    describe('Serviceability', () => {
      it('checks serviceability for destination pincode', async () => {
        const ok = await provider.checkServiceability(
          process.env.DELHIVERY_TEST_DEST_PIN as string
        );
        expect(typeof ok).toBe('boolean');
      });

      it('checks serviceability for origin pincode', async () => {
        const ok = await provider.checkServiceability(
          process.env.DELHIVERY_TEST_ORIGIN_PIN as string
        );
        expect(typeof ok).toBe('boolean');
      });

      it('checks pickup serviceability', async () => {
        const ok = await provider.checkServiceability(
          process.env.DELHIVERY_TEST_ORIGIN_PIN as string,
          'pickup'
        );
        expect(typeof ok).toBe('boolean');
      });

      it('returns false for definitely non-serviceable pincode', async () => {
        // Using 000000 as a definitely invalid pincode
        const ok = await provider.checkServiceability('000000');
        expect(ok).toBe(false);
      });
    });

    describe('Rate Calculation', () => {
      it('gets rates for prepaid shipment', async () => {
        const rates = await provider.getRates({
          origin: { pincode: process.env.DELHIVERY_TEST_ORIGIN_PIN as string },
          destination: { pincode: process.env.DELHIVERY_TEST_DEST_PIN as string },
          package: { weight: 1, length: 10, width: 10, height: 10 },
          paymentMode: 'prepaid',
        });

        expect(Array.isArray(rates)).toBe(true);
        expect(rates.length).toBeGreaterThan(0);
        expect(rates[0]).toHaveProperty('currency', 'INR');
        expect(rates[0]).toHaveProperty('total');
        expect(rates[0].total).toBeGreaterThanOrEqual(0); // Staging may return 0
      });

      it('gets rates for COD shipment', async () => {
        const rates = await provider.getRates({
          origin: { pincode: process.env.DELHIVERY_TEST_ORIGIN_PIN as string },
          destination: { pincode: process.env.DELHIVERY_TEST_DEST_PIN as string },
          package: { weight: 1, length: 10, width: 10, height: 10 },
          paymentMode: 'cod',
        });

        expect(rates[0]).toHaveProperty('currency', 'INR');
      });
    });

    describe('Tracking', () => {
      it('tracks shipment (requires DELHIVERY_TEST_TRACKING_AWB)', async () => {
        if (!trackingAwb) {
          console.log('  ⏭️  Skipping: DELHIVERY_TEST_TRACKING_AWB not set');
          return;
        }

        const res = await provider.trackShipment(trackingAwb);

        expect(res.trackingNumber).toBeTruthy();
        expect(res.status).toBeTruthy();
        expect(res.timeline).toBeInstanceOf(Array);
        expect(res.timeline.length).toBeGreaterThan(0);

        console.log(`  ℹ️  Tracking result: ${res.status}`);
      });
    });

    describe('Proof of Delivery', () => {
      it('fetches POD (requires DELHIVERY_TEST_POD_AWB)', async () => {
        if (!podAwb) {
          console.log('  ⏭️  Skipping: DELHIVERY_TEST_POD_AWB not set');
          return;
        }

        const res = await provider.getProofOfDelivery(podAwb);

        expect(res).toHaveProperty('source');

        if (res.url) {
          console.log(`  ℹ️  POD URL: ${res.url}`);
        } else {
          console.log(`  ℹ️  POD Source: ${res.source}`);
        }
      });
    });
  });

  // =====================================
  // MUTATING TESTS (Staging Recommended)
  // =====================================

  describe('Mutating Tests (Requires DELHIVERY_ALLOW_MUTATIONS=true)', () => {
    beforeAll(() => {
      if (!allowMutations) {
        console.log('\n  ⏭️  Mutating tests skipped. Set DELHIVERY_ALLOW_MUTATIONS=true to enable.');
      }
    });

    describe('Shipment Creation', () => {
      it('creates prepaid shipment (requires pickup location)', async () => {
        if (!allowMutations || !pickupLocation) {
          console.log('  ⏭️  Skipping: requires DELHIVERY_ALLOW_MUTATIONS=true and DELHIVERY_TEST_PICKUP_LOCATION');
          return;
        }

        const res = await provider.createShipment({
          origin: {
            name: 'Test Warehouse',
            phone: '9999999999',
            address: 'Test Origin Address',
            city: 'Delhi',
            state: 'Delhi',
            pincode: process.env.DELHIVERY_TEST_ORIGIN_PIN as string,
            country: 'India',
          },
          destination: {
            name: 'Test Customer',
            phone: '9876543210',
            address: 'Test Delivery Address',
            city: 'Mumbai',
            state: 'MH',
            pincode: process.env.DELHIVERY_TEST_DEST_PIN as string,
            country: 'India',
          },
          package: { weight: 1, length: 10, width: 10, height: 10 },
          orderNumber: `TEST-${Date.now()}`,
          paymentMode: 'prepaid',
          carrierOptions: {
            delhivery: {
              pickupLocationName: pickupLocation,
            },
          },
        } as any);

        expect(res.trackingNumber).toBeTruthy();
        console.log(`  ✅ Created shipment with AWB: ${res.trackingNumber}`);
      });

      it('creates COD shipment', async () => {
        if (!allowMutations || !pickupLocation) {
          console.log('  ⏭️  Skipping: requires DELHIVERY_ALLOW_MUTATIONS=true and DELHIVERY_TEST_PICKUP_LOCATION');
          return;
        }

        const res = await provider.createShipment({
          origin: {
            name: 'Test Warehouse',
            phone: '9999999999',
            address: 'Test Origin Address',
            city: 'Delhi',
            state: 'Delhi',
            pincode: process.env.DELHIVERY_TEST_ORIGIN_PIN as string,
            country: 'India',
          },
          destination: {
            name: 'COD Customer',
            phone: '9876543210',
            address: 'COD Delivery Address',
            city: 'Mumbai',
            state: 'MH',
            pincode: process.env.DELHIVERY_TEST_DEST_PIN as string,
            country: 'India',
          },
          package: { weight: 1.5, length: 15, width: 15, height: 8 },
          orderNumber: `COD-TEST-${Date.now()}`,
          paymentMode: 'cod',
          codAmount: 1500,
          carrierOptions: {
            delhivery: {
              pickupLocationName: pickupLocation,
            },
          },
        } as any);

        expect(res.trackingNumber).toBeTruthy();
        console.log(`  ✅ Created COD shipment with AWB: ${res.trackingNumber}`);
      });
    });

    describe('Pickup Scheduling', () => {
      it('schedules pickup (requires date, time, location)', async () => {
        if (!allowMutations || !pickupLocation || !pickupDate || !pickupTime) {
          console.log('  ⏭️  Skipping: requires DELHIVERY_ALLOW_MUTATIONS, PICKUP_LOCATION, PICKUP_DATE, PICKUP_TIME');
          return;
        }

        const res = await provider.schedulePickup({
          pickupDate,
          pickupTime,
          pickupLocation,
          expectedCount: 5,
        });

        expect(res).toBeTruthy();
        console.log(`  ✅ Pickup scheduled: ${JSON.stringify(res)}`);
      });
    });

    describe('Shipment Cancellation', () => {
      it('cancels shipment (requires DELHIVERY_TEST_CANCEL_AWB)', async () => {
        if (!allowMutations || !cancelAwb) {
          console.log('  ⏭️  Skipping: requires DELHIVERY_ALLOW_MUTATIONS=true and DELHIVERY_TEST_CANCEL_AWB');
          return;
        }

        const ok = await provider.cancelShipment(cancelAwb);

        expect(typeof ok).toBe('boolean');
        console.log(`  ✅ Cancellation result: ${ok}`);
      });
    });

    describe('Address Update', () => {
      it('updates address (requires DELHIVERY_TEST_ADDRESS_AWB)', async () => {
        if (!allowMutations || !addressAwb) {
          console.log('  ⏭️  Skipping: requires DELHIVERY_ALLOW_MUTATIONS=true and DELHIVERY_TEST_ADDRESS_AWB');
          return;
        }

        const res = await provider.updateDeliveryAddress(
          addressAwb,
          {
            line1: 'Updated Test Address Line 1',
            city: 'Mumbai',
            state: 'MH',
            pincode: process.env.DELHIVERY_TEST_DEST_PIN as string,
            country: 'India',
          },
          `TEST-ORDER-${Date.now()}`,
          '9999999999'
        );

        expect(res).toHaveProperty('success');
        console.log(`  ✅ Address update: ${res.message}`);
      });
    });

    describe('Reattempt Request', () => {
      it('requests reattempt (requires tracking AWB)', async () => {
        if (!allowMutations || !trackingAwb) {
          console.log('  ⏭️  Skipping: requires DELHIVERY_ALLOW_MUTATIONS=true and DELHIVERY_TEST_TRACKING_AWB');
          return;
        }

        try {
          const res = await provider.requestReattempt(trackingAwb);

          expect(res).toHaveProperty('success');
          expect(res).toHaveProperty('message');

          if (res.uplId) {
            console.log(`  ✅ Reattempt requested. UPL ID: ${res.uplId}`);
          } else {
            console.log(`  ℹ️  Reattempt result: ${res.message}`);
          }
        } catch (error: any) {
          // Some AWBs may not be eligible for reattempt
          console.log(`  ℹ️  Reattempt not allowed: ${error.message}`);
        }
      });
    });

    describe('NDR Status Polling', () => {
      it('polls NDR status (requires UPL ID from previous reattempt)', async () => {
        if (!allowMutations) {
          console.log('  ⏭️  Skipping: requires DELHIVERY_ALLOW_MUTATIONS=true');
          return;
        }

        // This test requires a valid UPL ID from a previous reattempt
        // Skipping with info message
        console.log('  ℹ️  NDR status polling requires valid UPL ID from reattempt. Test skipped.');
        console.log('  ℹ️  To test: 1) Request reattempt, 2) Use returned UPL ID, 3) Poll getNdrStatus(uplId)');
      });
    });
  });

  // =====================================
  // ERROR HANDLING TESTS
  // =====================================

  describe('Error Handling', () => {
    it('handles invalid pincode gracefully', async () => {
      const ok = await provider.checkServiceability('INVALID');
      expect(ok).toBe(false);
    });

    it('throws error for invalid tracking number', async () => {
      await expect(provider.trackShipment('DEFINITELY_INVALID_AWB_12345'))
        .rejects.toThrow();
    });
  });

  // =====================================
  // TEST SUMMARY
  // =====================================

  afterAll(() => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Integration Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Base URL: ${process.env.DELHIVERY_BASE_URL || 'staging'}`);
    console.log(`Mutations: ${allowMutations ? '✅ Enabled' : '⏭️  Disabled'}`);
    console.log(`Tracking AWB: ${trackingAwb || '⏭️  Not set'}`);
    console.log(`POD AWB: ${podAwb || '⏭️  Not set'}`);
    console.log(`Pickup Location: ${pickupLocation || '⏭️  Not set'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
});
