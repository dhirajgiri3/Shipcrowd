import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';

const IN_FLIGHT_STATUSES = [
  'created',
  'ready_to_ship',
  'pending_pickup',
  'picked_up',
  'shipped',
  'awaiting_carrier_sync',
  'in_transit',
  'out_for_delivery',
  'ndr',
  'rto_initiated',
  'rto_in_transit',
] as const;

function round2(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

function normalizeProvider(carrier: string | undefined): string {
  if (!carrier) return 'unknown';
  return String(carrier).trim().toLowerCase().replace(/\s+/g, '_');
}

async function run() {
  console.log('🔧 Backfilling selectedQuote for in-flight shipments...');
  await mongoose.connect(MONGODB_URI);

  try {
    const { Shipment } = await import('../../src/infrastructure/database/mongoose/models');

    const filter = {
      isDeleted: false,
      currentStatus: { $in: IN_FLIGHT_STATUSES as any },
      $or: [
        { pricingDetails: { $exists: false } },
        { 'pricingDetails.selectedQuote': { $exists: false } },
        { 'pricingDetails.selectedQuote.optionId': { $exists: false } },
      ],
    };

    const shipments = await Shipment.find(filter)
      .select('_id carrier serviceType packageDetails paymentDetails pricingDetails createdAt updatedAt')
      .lean();

    if (!shipments.length) {
      console.log('✅ No in-flight shipments require selectedQuote backfill');
      return;
    }

    const operations = shipments.map((shipment: any) => {
      const existingPricing = shipment.pricingDetails || {};
      const shippingCost = round2(
        Number(existingPricing.totalPrice) || Number(shipment.paymentDetails?.shippingCost) || 0
      );
      const expectedCostAmount = round2(
        Number(existingPricing.subtotal) || Number(existingPricing.baseRate) || shippingCost
      );
      const marginAmount = round2(shippingCost - expectedCostAmount);
      const marginPercent = shippingCost > 0 ? round2((marginAmount / shippingCost) * 100) : 0;

      return {
        updateOne: {
          filter: { _id: shipment._id },
          update: {
            $set: {
              'pricingDetails.selectedQuote': {
                optionId: `migrated-${String(shipment._id)}`,
                provider: normalizeProvider(shipment.carrier),
                serviceName: shipment.serviceType || 'standard',
                quotedSellAmount: shippingCost,
                expectedCostAmount,
                expectedMarginAmount: marginAmount,
                expectedMarginPercent: marginPercent,
                chargeableWeight: round2(Number(shipment.packageDetails?.weight) || 0),
                zone: existingPricing.zone,
                pricingSource: 'table',
                confidence: 'low',
                calculatedAt: existingPricing.calculatedAt || shipment.updatedAt || shipment.createdAt,
              },
              'pricingDetails.rateCardId': null,
              'pricingDetails.rateCardName': 'service-level-pricing',
              'pricingDetails.calculationMethod': 'override',
            },
          },
        },
      };
    });

    const result = await Shipment.bulkWrite(operations, { ordered: false });

    console.log('✅ selectedQuote backfill complete');
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('❌ Backfill failed:', error);
  process.exit(1);
});
