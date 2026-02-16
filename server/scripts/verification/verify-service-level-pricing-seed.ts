import mongoose from 'mongoose';
import {
  CourierService,
  SellerCourierPolicy,
  ServiceRateCard,
} from '../../src/infrastructure/database/mongoose/models';

type RateCardCategory = 'default' | 'basic' | 'standard' | 'advanced' | 'custom';
const REQUIRED_CATEGORIES: RateCardCategory[] = ['default', 'basic', 'standard', 'advanced', 'custom'];

const fail = (message: string): never => {
  throw new Error(message);
};

async function main(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
  await mongoose.connect(mongoUri);

  try {
    const serviceCount = await CourierService.countDocuments({
      companyId: null,
      isDeleted: false,
      status: 'active',
      flowType: { $in: ['forward', 'both'] },
    });

    if (serviceCount < 100) {
      fail(`Expected at least 100 active platform services, found ${serviceCount}`);
    }

    const services = await CourierService.find({
      companyId: null,
      isDeleted: false,
      status: 'active',
      flowType: { $in: ['forward', 'both'] },
    })
      .select('_id serviceCode')
      .lean<Array<{ _id: mongoose.Types.ObjectId; serviceCode: string }>>();

    for (const service of services) {
      const costCard = await ServiceRateCard.exists({
        companyId: null,
        serviceId: service._id,
        cardType: 'cost',
        flowType: 'forward',
        category: 'default',
        status: 'active',
        isDeleted: false,
      });

      if (!costCard) {
        fail(`Missing active cost/default card for service ${service.serviceCode}`);
      }

      for (const category of REQUIRED_CATEGORIES) {
        const sellCard = await ServiceRateCard.exists({
          companyId: null,
          serviceId: service._id,
          cardType: 'sell',
          flowType: 'forward',
          category,
          status: 'active',
          isDeleted: false,
        });

        if (!sellCard) {
          fail(`Missing active sell/${category} card for service ${service.serviceCode}`);
        }
      }
    }

    const sellerPoliciesMissingDefaults = await SellerCourierPolicy.countDocuments({
      $or: [
        { rateCardType: { $exists: false } },
        { rateCardType: null },
        { rateCardType: '' },
        { rateCardCategory: { $exists: false } },
        { rateCardCategory: null },
        { rateCardCategory: '' },
      ],
    });

    if (sellerPoliciesMissingDefaults > 0) {
      fail(`Found ${sellerPoliciesMissingDefaults} seller policies missing rateCardType/rateCardCategory defaults`);
    }

    const rateCardCounts = await ServiceRateCard.aggregate([
      {
        $match: {
          companyId: null,
          isDeleted: false,
          status: 'active',
          flowType: 'forward',
        },
      },
      {
        $group: {
          _id: { cardType: '$cardType', category: '$category' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.cardType': 1, '_id.category': 1 } },
    ]);

    console.log('[Verify Seed] service-level pricing verification passed');
    console.log(
      JSON.stringify(
        {
          services: serviceCount,
          activeRateCardBuckets: rateCardCounts,
          requiredSellCategories: REQUIRED_CATEGORIES,
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('[Verify Seed] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
