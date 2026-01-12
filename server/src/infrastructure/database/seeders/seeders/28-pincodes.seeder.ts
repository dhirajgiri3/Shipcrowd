/**
 * Pincode Seeder
 * 
 * Populates initial pincode data for address validation.
 */

import { Pincode, IPincode } from '../../mongoose/models/logistics/pincode.model';
import { logger, createTimer } from '../utils/logger.utils';

// Sample pincode data for different regions
const SAMPLE_PINCODES: Partial<IPincode>[] = [
    // North - Delhi
    {
        pincode: '110001',
        postOffice: 'New Delhi GPO',
        district: 'New Delhi',
        state: 'Delhi',
        city: 'New Delhi',
        region: 'North',
        serviceability: {
            delhivery: { available: true, lastChecked: new Date() },
            bluedart: { available: true, lastChecked: new Date() },
            ecom: { available: true, lastChecked: new Date() },
            dtdc: { available: true, lastChecked: new Date() },
            xpressbees: { available: true, lastChecked: new Date() },
            shadowfax: { available: true, lastChecked: new Date() },
        },
        coordinates: { latitude: 28.6327, longitude: 77.2197 },
        isActive: true
    },
    // West - Mumbai
    {
        pincode: '400001',
        postOffice: 'Mumbai GPO',
        district: 'Mumbai',
        state: 'Maharashtra',
        city: 'Mumbai',
        region: 'West',
        serviceability: {
            delhivery: { available: true, lastChecked: new Date() },
            bluedart: { available: true, lastChecked: new Date() },
            ecom: { available: true, lastChecked: new Date() },
            dtdc: { available: true, lastChecked: new Date() },
            xpressbees: { available: true, lastChecked: new Date() },
            shadowfax: { available: true, lastChecked: new Date() },
        },
        coordinates: { latitude: 18.9388, longitude: 72.8354 },
        isActive: true
    },
    // South - Bengaluru
    {
        pincode: '560001',
        postOffice: 'Bangalore GPO',
        district: 'Bangalore Urban',
        state: 'Karnataka',
        city: 'Bengaluru',
        region: 'South',
        serviceability: {
            delhivery: { available: true, lastChecked: new Date() },
            bluedart: { available: true, lastChecked: new Date() },
            ecom: { available: true, lastChecked: new Date() },
            dtdc: { available: true, lastChecked: new Date() },
            xpressbees: { available: true, lastChecked: new Date() },
            shadowfax: { available: true, lastChecked: new Date() },
        },
        coordinates: { latitude: 12.9847, longitude: 77.5971 },
        isActive: true
    },
    // East - Kolkata
    {
        pincode: '700001',
        postOffice: 'Kolkata GPO',
        district: 'Kolkata',
        state: 'West Bengal',
        city: 'Kolkata',
        region: 'East',
        serviceability: {
            delhivery: { available: true, lastChecked: new Date() },
            bluedart: { available: true, lastChecked: new Date() },
            ecom: { available: true, lastChecked: new Date() },
            dtdc: { available: true, lastChecked: new Date() },
            xpressbees: { available: true, lastChecked: new Date() },
            shadowfax: { available: true, lastChecked: new Date() },
        },
        coordinates: { latitude: 22.5697, longitude: 88.3697 },
        isActive: true
    },
    // Northeast - Guwahati
    {
        pincode: '781001',
        postOffice: 'Guwahati GPO',
        district: 'Kamrup',
        state: 'Assam',
        city: 'Guwahati',
        region: 'Northeast',
        serviceability: {
            delhivery: { available: true, lastChecked: new Date() },
            bluedart: { available: true, lastChecked: new Date() },
            ecom: { available: false, lastChecked: new Date() },
            dtdc: { available: true, lastChecked: new Date() },
            xpressbees: { available: true, lastChecked: new Date() },
            shadowfax: { available: false, lastChecked: new Date() },
        },
        coordinates: { latitude: 26.1851, longitude: 91.7516 },
        isActive: true
    },
    // Central - Bhopal
    {
        pincode: '462001',
        postOffice: 'Bhopal GPO',
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        city: 'Bhopal',
        region: 'Central',
        serviceability: {
            delhivery: { available: true, lastChecked: new Date() },
            bluedart: { available: true, lastChecked: new Date() },
            ecom: { available: true, lastChecked: new Date() },
            dtdc: { available: true, lastChecked: new Date() },
            xpressbees: { available: true, lastChecked: new Date() },
            shadowfax: { available: true, lastChecked: new Date() },
        },
        coordinates: { latitude: 23.2599, longitude: 77.4126 },
        isActive: true
    }
];

export async function seedPincodes(): Promise<void> {
    const timer = createTimer();
    logger.step(28, 'Seeding Pincodes');

    try {
        await Pincode.deleteMany({}); // Clear existing for this specific run if needed, but handled by global clean usually

        await Pincode.insertMany(SAMPLE_PINCODES);

        logger.complete('pincodes', SAMPLE_PINCODES.length, timer.elapsed());
    } catch (error) {
        logger.error('Failed to seed pincodes:', error);
        throw error;
    }
}
