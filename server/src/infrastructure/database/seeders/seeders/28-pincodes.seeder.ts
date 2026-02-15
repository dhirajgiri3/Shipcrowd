/**
 * Pincode Seeder
 * 
 * Populates pincode data from CSV file for serviceability management.
 * 
 * Strategy:
 * - Loads all pincodes from CSV (154k records)
 * - Stores only pincode + serviceability flags in DB
 * - City/State data is cached in memory via PincodeLookupService
 */

import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { IPincode, Pincode } from '../../mongoose/models/logistics/pincode.model';
import { createTimer, logger } from '../utils/logger.utils';

interface CSVRow {
    pincode: string;
    city: string;
    state: string;
}

export async function seedPincodes(): Promise<void> {
    const timer = createTimer();
    logger.step(28, 'Seeding Pincodes from CSV');

    try {
        // Clear existing pincodes
        await Pincode.deleteMany({});

        const csvPath = path.join(__dirname, '../../../../assets/pincodes.csv');
        const pincodes: Partial<IPincode>[] = [];

        // Read and parse CSV
        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row: CSVRow) => {
                    const pincode = row.pincode?.trim();
                    const city = row.city?.trim();
                    const state = row.state?.trim();

                    if (pincode && city && state) {
                        pincodes.push({
                            pincode,
                            postOffice: `${city} Post Office`,
                            district: city,
                            state,
                            city,
                            region: getRegion(state),
                            serviceability: {
                                delhivery: { available: false, lastChecked: new Date() },
                                bluedart: { available: false, lastChecked: new Date() },
                                ecom: { available: false, lastChecked: new Date() },
                                dtdc: { available: false, lastChecked: new Date() },
                                xpressbees: { available: false, lastChecked: new Date() },
                                shadowfax: { available: false, lastChecked: new Date() },
                            },
                            isActive: true
                        });
                    }
                })
                .on('end', () => resolve())
                .on('error', (error) => reject(error));
        });

        logger.info(`Parsed ${pincodes.length} pincodes from CSV`);

        // Batch insert to avoid memory issues
        const BATCH_SIZE = 5000;
        let inserted = 0;

        for (let i = 0; i < pincodes.length; i += BATCH_SIZE) {
            const batch = pincodes.slice(i, i + BATCH_SIZE);
            await Pincode.insertMany(batch, { ordered: false });
            inserted += batch.length;

            if (inserted % 25000 === 0) {
                logger.info(`Inserted ${inserted}/${pincodes.length} pincodes...`);
            }
        }

        logger.complete('pincodes', inserted, timer.elapsed());
    } catch (error: any) {
        // Ignore duplicate key errors (code 11000)
        if (error.code === 11000) {
            logger.warn('Some duplicate pincodes skipped');
        } else {
            logger.error('Failed to seed pincodes:', error);
            throw error;
        }
    }
}

/**
 * Determine region from state name
 */
function getRegion(state: string): 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Central' {
    const stateUpper = state.toUpperCase();

    // North
    if (['DELHI', 'PUNJAB', 'HARYANA', 'HIMACHAL PRADESH', 'UTTARAKHAND', 'CHANDIGARH'].includes(stateUpper)) {
        return 'North';
    }

    // South
    if (['KARNATAKA', 'TAMIL NADU', 'KERALA', 'ANDHRA PRADESH', 'TELANGANA', 'PUDUCHERRY'].includes(stateUpper)) {
        return 'South';
    }

    // East
    if (['WEST BENGAL', 'ODISHA', 'BIHAR', 'JHARKHAND'].includes(stateUpper)) {
        return 'East';
    }

    // West
    if (['MAHARASHTRA', 'GUJARAT', 'RAJASTHAN', 'GOA', 'DADRA AND NAGAR HAVELI', 'DAMAN AND DIU'].includes(stateUpper)) {
        return 'West';
    }

    // Northeast
    if (['ASSAM', 'ARUNACHAL PRADESH', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'TRIPURA', 'SIKKIM'].includes(stateUpper)) {
        return 'Northeast';
    }

    // Central (default)
    return 'Central';
}
