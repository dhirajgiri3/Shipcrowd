/* eslint-disable no-console */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const { ObjectId } = require('mongodb');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
};

const companyName = getArg('--company') || 'Global Trading Company';
const rateCardNameFilter = getArg('--ratecard');
const days = Number(getArg('--days') || 30);

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in server/.env');
  }

  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const companies = db.collection('companies');
  const ratecards = db.collection('ratecards');
  const shipments = db.collection('shipments');

  const company = await companies.findOne({ name: companyName, isDeleted: false });
  if (!company) {
    console.log(`Company not found: ${companyName}`);
    return;
  }

  console.log(`Company: ${company.name} (${company._id})`);
  const defaultRateCardId = company.settings && company.settings.defaultRateCardId
    ? String(company.settings.defaultRateCardId)
    : null;
  console.log(`Company Default Rate Card ID: ${defaultRateCardId || 'None'}`);

  const rateCards = await ratecards
    .find({
      companyId: company._id,
      isDeleted: false,
      ...(rateCardNameFilter ? { name: rateCardNameFilter } : {})
    })
    .sort({ createdAt: -1 })
    .toArray();

  if (!rateCards.length) {
    console.log('No rate cards found for company with given filters.');
    return;
  }

  console.log(`Rate Cards Found: ${rateCards.length}`);
  rateCards.forEach((rc) => {
    console.log(`- ${rc.name} | id=${rc._id} | status=${rc.status} | createdAt=${rc.createdAt}`);
  });

  const startDate = daysAgo(days);
  const endDate = new Date();
  console.log(`\nDate Range: ${startDate.toISOString()} -> ${endDate.toISOString()}`);

  const companyShipmentStats = await shipments.aggregate([
    {
      $match: {
        companyId: company._id,
        isDeleted: false,
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalShipments: { $sum: 1 },
        totalRevenue: {
          $sum: { $ifNull: ['$pricingDetails.totalPrice', '$paymentDetails.shippingCost'] }
        },
        pricedShipments: {
          $sum: {
            $cond: [{ $ifNull: ['$pricingDetails.totalPrice', false] }, 1, 0]
          }
        }
      }
    }
  ]);

  console.log('\nCompany 30d Shipment Summary:', companyShipmentStats[0] || { totalShipments: 0 });

  const companyAllTime = await shipments.countDocuments({
    companyId: company._id,
    isDeleted: false
  });
  console.log(`Company All-Time Shipments: ${companyAllTime}`);

  const companyWithPricingDetails = await shipments.countDocuments({
    companyId: company._id,
    isDeleted: false,
    'pricingDetails.rateCardId': { $exists: true }
  });
  const companyWithoutPricingDetails = await shipments.countDocuments({
    companyId: company._id,
    isDeleted: false,
    'pricingDetails.rateCardId': { $exists: false }
  });
  console.log(`Company Shipments With pricingDetails.rateCardId: ${companyWithPricingDetails}`);
  console.log(`Company Shipments Without pricingDetails.rateCardId: ${companyWithoutPricingDetails}`);

  const companyRateCardIds = await shipments.distinct('pricingDetails.rateCardId', {
    companyId: company._id,
    isDeleted: false
  });
  const companyRateCardNames = await shipments.distinct('pricingDetails.rateCardName', {
    companyId: company._id,
    isDeleted: false
  });
  console.log('Company Distinct pricingDetails.rateCardId:', companyRateCardIds.map(String));
  console.log('Company Distinct pricingDetails.rateCardName:', companyRateCardNames.filter(Boolean));

  const overall30d = await shipments.countDocuments({
    isDeleted: false,
    createdAt: { $gte: startDate, $lte: endDate }
  });
  console.log(`Overall 30d Shipments (all companies): ${overall30d}`);

  for (const rc of rateCards) {
    const matchers = [
      { 'pricingDetails.rateCardId': rc._id },
      { 'pricingDetails.rateCardId': String(rc._id) },
      { 'pricingDetails.rateCardName': rc.name }
    ];

    const allTimeForRateCard = await shipments.countDocuments({
      isDeleted: false,
      $or: matchers
    });

    const usage = await shipments.aggregate([
      {
        $match: {
          companyId: company._id,
          isDeleted: false,
          createdAt: { $gte: startDate, $lte: endDate },
          $or: matchers
        }
      },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalRevenue: {
            $sum: { $ifNull: ['$pricingDetails.totalPrice', '$paymentDetails.shippingCost'] }
          },
          avgCost: {
            $avg: { $ifNull: ['$pricingDetails.totalPrice', '$paymentDetails.shippingCost'] }
          }
        }
      }
    ]);

    const usageRow = usage[0] || { totalShipments: 0, totalRevenue: 0, avgCost: 0 };
    console.log(`\nRate Card: ${rc.name} (${rc._id})`);
    console.log(`All-Time Shipments for Rate Card (all companies): ${allTimeForRateCard}`);
    console.log(`Usage 30d: shipments=${usageRow.totalShipments}, revenue=${usageRow.totalRevenue}, avgCost=${usageRow.avgCost}`);

    const pricingDetailCounts = await shipments.aggregate([
      {
        $match: {
          companyId: company._id,
          isDeleted: false,
          createdAt: { $gte: startDate, $lte: endDate },
          $or: matchers
        }
      },
      {
        $group: {
          _id: null,
          hasPricingDetails: {
            $sum: {
              $cond: [{ $ifNull: ['$pricingDetails.totalPrice', false] }, 1, 0]
            }
          },
          hasShippingCost: {
            $sum: {
              $cond: [{ $ifNull: ['$paymentDetails.shippingCost', false] }, 1, 0]
            }
          }
        }
      }
    ]);

    console.log('Detail presence:', pricingDetailCounts[0] || { hasPricingDetails: 0, hasShippingCost: 0 });
  }
}

main()
  .catch((err) => {
    console.error('Error:', err);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('Disconnected');
  });
