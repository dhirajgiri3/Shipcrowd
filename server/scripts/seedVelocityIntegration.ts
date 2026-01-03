/**
 * Seed Velocity Shipfast Integration
 *
 * This script creates the Velocity Shipfast courier integration
 * for a company in the database.
 *
 * Usage:
 *   ts-node src/scripts/seedVelocityIntegration.ts <companyId>
 *
 * Example:
 *   ts-node src/scripts/seedVelocityIntegration.ts 60a1b2c3d4e5f6g7h8i9j0k1
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Integration from '../infrastructure/database/mongoose/models/integration.model';
import { encryptData } from '../shared/utils/encryption';

// Load environment variables
dotenv.config();

async function seedVelocityIntegration(companyId: string) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Validate companyId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error(`Invalid companyId: ${companyId}`);
    }

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    // Check if integration already exists
    const existingIntegration = await Integration.findOne({
      companyId: companyObjectId,
      type: 'courier',
      provider: 'velocity-shipfast'
    });

    if (existingIntegration) {
      console.log('⚠️  Velocity integration already exists for this company');
      console.log('Integration ID:', existingIntegration._id);
      console.log('Status:', existingIntegration.settings?.isActive ? 'Active' : 'Inactive');

      // Update to ensure it's active
      existingIntegration.settings = existingIntegration.settings || {};
      existingIntegration.settings.isActive = true;
      await existingIntegration.save();

      console.log('✅ Integration updated to active');
      return;
    }

    // Get credentials from environment
    const username = process.env.VELOCITY_USERNAME;
    const password = process.env.VELOCITY_PASSWORD;

    if (!username || !password) {
      throw new Error('VELOCITY_USERNAME and VELOCITY_PASSWORD must be set in .env');
    }

    // Create new integration
    const integration = await Integration.create({
      companyId: companyObjectId,
      type: 'courier',
      provider: 'velocity-shipfast',
      credentials: {
        username: encryptData(username),
        password: encryptData(password)
      },
      settings: {
        isActive: true,
        isPrimary: true,
        webhookUrl: '/api/v1/webhooks/velocity'
      },
      metadata: {
        testWarehouseId: process.env.VELOCITY_TEST_WAREHOUSE_ID || 'WHYYB5',
        environment: process.env.NODE_ENV || 'development',
        apiVersion: 'v1',
        baseUrl: process.env.VELOCITY_BASE_URL || 'https://shazam.velocity.in'
      }
    });

    console.log('✅ Velocity Shipfast integration created successfully!');
    console.log('\nIntegration Details:');
    console.log('  ID:', integration._id);
    console.log('  Company ID:', integration.companyId);
    console.log('  Provider:', integration.provider);
    console.log('  Status:', integration.settings?.isActive ? 'Active ✅' : 'Inactive ❌');
    console.log('  Primary:', integration.settings?.isPrimary ? 'Yes' : 'No');
    console.log('  Webhook URL:', integration.settings?.webhookUrl);
    console.log('\nCredentials: Encrypted ✅');
    console.log('\nYou can now use VelocityShipfastProvider with this company!');

  } catch (error) {
    console.error('❌ Error seeding integration:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Get companyId from command line
const companyId = process.argv[2];

if (!companyId) {
  console.error('❌ Error: Company ID is required');
  console.log('\nUsage:');
  console.log('  ts-node src/scripts/seedVelocityIntegration.ts <companyId>');
  console.log('\nExample:');
  console.log('  ts-node src/scripts/seedVelocityIntegration.ts 60a1b2c3d4e5f6g7h8i9j0k1');
  process.exit(1);
}

// Run the seeder
seedVelocityIntegration(companyId)
  .then(() => {
    console.log('\n🎉 Integration seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
