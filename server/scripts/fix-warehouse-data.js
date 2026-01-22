/**
 * Fix Warehouse Data Schema Issues
 *
 * Fixes warehouses with:
 * - contact field (should be contactInfo)
 * - weekdays/saturday/sunday operatingHours (should be individual days)
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

async function fixWarehouseData() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');

        const db = mongoose.connection.db;
        const warehouses = await db.collection('warehouses').find({}).toArray();

        console.log(`📦 Found ${warehouses.length} warehouses to check\n`);

        let fixedCount = 0;
        const bulkOps = [];

        for (const warehouse of warehouses) {
            const setUpdates = {};
            const unsetUpdates = {};
            let needsUpdate = false;

            // FIX 1: Rename 'contact' to 'contactInfo'
            if (warehouse.contact && !warehouse.contactInfo) {
                setUpdates.contactInfo = warehouse.contact;
                unsetUpdates.contact = '';
                needsUpdate = true;
                console.log(`  ⚠️  ${warehouse.name}: contact → contactInfo`);
            }

            // FIX 2: Convert weekdays/saturday/sunday to individual days
            if (warehouse.operatingHours) {
                const hours = warehouse.operatingHours;

                if (hours.weekdays || hours.saturday || hours.sunday) {
                    // Old format detected
                    const weekdayHours = hours.weekdays || { open: '09:00', close: '18:00' };
                    const saturdayHours = hours.saturday || { open: '09:00', close: '14:00' };
                    const sundayHours = hours.sunday || { open: null, close: null };

                    setUpdates.operatingHours = {
                        monday: weekdayHours,
                        tuesday: weekdayHours,
                        wednesday: weekdayHours,
                        thursday: weekdayHours,
                        friday: weekdayHours,
                        saturday: saturdayHours,
                        sunday: sundayHours,
                    };
                    needsUpdate = true;
                    console.log(`  ⚠️  ${warehouse.name}: fixed operatingHours structure`);
                }
            }

            if (needsUpdate) {
                const update = {};
                if (Object.keys(setUpdates).length > 0) {
                    update.$set = setUpdates;
                }
                if (Object.keys(unsetUpdates).length > 0) {
                    update.$unset = unsetUpdates;
                }

                bulkOps.push({
                    updateOne: {
                        filter: { _id: warehouse._id },
                        update: update
                    }
                });
                fixedCount++;
            }
        }

        if (bulkOps.length > 0) {
            console.log(`\n🔧 Fixing ${bulkOps.length} warehouses...`);
            await db.collection('warehouses').bulkWrite(bulkOps);
            console.log(`✅ Fixed ${fixedCount} warehouses\n`);
        } else {
            console.log('✅ All warehouses already have correct schema\n');
        }

        await mongoose.disconnect();
        console.log('✓ Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixWarehouseData();
