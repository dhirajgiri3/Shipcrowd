/**
 * Warehouses Seeder
 * 
 * Generates warehouses for companies (2-3 per company, 2-4 for B2B).
 */

import mongoose from 'mongoose';
import Warehouse from '../../mongoose/models/logistics/warehouse/structure/warehouse.model';
import Company from '../../mongoose/models/organization/core/company.model';
import { SEED_CONFIG } from '../config';
import { randomInt, randomFloat, selectRandom } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { generateIndianName, generateIndianPhone, generateEmail } from '../data/customer-names';
import { getCityByName, getNearbyCities, getCityCoordinates, CityData } from '../data/indian-cities';
import { generateIndustrialAddress } from '../utils/address.utils';
import { generateCarrierWarehouseId } from '../data/carrier-data';

/**
 * Generate operating hours
 */
function generateOperatingHours() {
    return {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '10:00', close: '16:00' },
        sunday: { open: null, close: null }, // Closed
    };
}

/**
 * Determine business type from company name (simplified heuristic)
 */
function getBusinessTypeFromName(companyName: string): 'fashion' | 'electronics' | 'b2b' {
    const name = companyName.toLowerCase();
    if (name.includes('wholesale') || name.includes('trader') || name.includes('b2b') ||
        name.includes('industrial') || name.includes('bulk') || name.includes('distributor')) {
        return 'b2b';
    }
    if (name.includes('tech') || name.includes('electronic') || name.includes('digital') ||
        name.includes('mobile') || name.includes('gadget') || name.includes('computer')) {
        return 'electronics';
    }
    return 'fashion';
}

/**
 * Generate warehouse data
 */
function generateWarehouseData(
    company: any,
    warehouseIndex: number,
    city: CityData,
    usedNames: Set<string>
): any {
    const coordinates = getCityCoordinates(city.name);
    const contactPerson = generateIndianName();

    let name = `${company.name.split(' ')[0]} ${city.name} WH-${warehouseIndex + 1}`;

    // Ensure uniqueness
    if (usedNames.has(name)) {
        name = `${company.name.substring(0, 10)} ${city.name} WH-${warehouseIndex + 1} ${randomInt(10, 99)}`;
    }

    // Double check and assume unique enough with randomInt, but track it
    if (usedNames.has(name)) {
        name = `${name}-${randomInt(100, 999)}`;
    }
    usedNames.add(name);

    return {
        name,
        companyId: company._id,
        address: {
            line1: generateIndustrialAddress(city.name),
            line2: `Warehouse Complex, Unit ${randomInt(1, 50)}`,
            city: city.name,
            state: city.state,
            country: 'India',
            postalCode: selectRandom(city.pincodes),
            coordinates: {
                latitude: coordinates.lat + randomFloat(-0.1, 0.1, 6),
                longitude: coordinates.lng + randomFloat(-0.1, 0.1, 6),
            },
        },
        contactInfo: {
            name: contactPerson,
            phone: generateIndianPhone(),
            email: `warehouse${warehouseIndex + 1}@${company.billingInfo?.gstin?.slice(2, 12) || 'company'}.com`.toLowerCase(),
            alternatePhone: generateIndianPhone(),
        },
        operatingHours: generateOperatingHours(),
        isActive: true,
        isDefault: warehouseIndex === 0, // First warehouse is default
        isDeleted: false,
        carrierDetails: {
            velocityWarehouseId: generateCarrierWarehouseId('delhivery'),
            delhiveryWarehouseId: generateCarrierWarehouseId('delhivery'),
            dtdcWarehouseId: generateCarrierWarehouseId('dtdc'),
            xpressbeesWarehouseId: generateCarrierWarehouseId('xpressbees'),
            lastSyncedAt: new Date(Date.now() - randomInt(1, 7) * 24 * 60 * 60 * 1000),
        },
    };
}

/**
 * Main seeder function
 */
export async function seedWarehouses(): Promise<void> {
    const timer = createTimer();
    logger.step(4, 'Seeding Warehouses');

    try {
        // Get approved companies
        const companies = await Company.find({ status: 'approved' }).lean();

        if (companies.length === 0) {
            logger.warn('No approved companies found. Skipping warehouses seeder.');
            return;
        }

        const warehouses: any[] = [];
        const companyDefaultWarehouses: Map<string, mongoose.Types.ObjectId> = new Map();
        const usedNames = new Set<string>();

        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];
            const businessType = getBusinessTypeFromName(company.name);

            // Determine number of warehouses based on business type
            const warehouseCount = businessType === 'b2b'
                ? randomInt(SEED_CONFIG.volume.warehousesPerB2BCompany.min, SEED_CONFIG.volume.warehousesPerB2BCompany.max)
                : randomInt(SEED_CONFIG.volume.warehousesPerCompany.min, SEED_CONFIG.volume.warehousesPerCompany.max);

            // Get company's home city
            const homeCity = getCityByName(company.address?.city || 'Mumbai');
            if (!homeCity) continue;

            // Get nearby cities for additional warehouses
            const nearbyCities = getNearbyCities(company.address?.city || 'Mumbai');

            for (let j = 0; j < warehouseCount; j++) {
                // First warehouse in home city, others in nearby cities
                const city = j === 0 ? homeCity : selectRandom(nearbyCities);

                const warehouseData = generateWarehouseData(company, j, city, usedNames);
                warehouses.push(warehouseData);
            }

            if ((i + 1) % 20 === 0 || i === companies.length - 1) {
                logger.progress(i + 1, companies.length, 'Companies processed');
            }
        }

        // Insert all warehouses
        const insertedWarehouses = await Warehouse.insertMany(warehouses);

        // Update company default warehouse settings
        const bulkOps: any[] = [];

        for (const warehouse of insertedWarehouses) {
            if (warehouse.isDefault) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: warehouse.companyId },
                        update: { 'settings.defaultWarehouseId': warehouse._id },
                    },
                });
            }
        }

        if (bulkOps.length > 0) {
            await Company.bulkWrite(bulkOps);
        }

        // Calculate statistics
        const uniqueCompanies = new Set(warehouses.map(w => w.companyId.toString())).size;
        const avgPerCompany = (warehouses.length / uniqueCompanies).toFixed(1);

        logger.complete('warehouses', warehouses.length, timer.elapsed());
        logger.table({
            'Total Warehouses': warehouses.length,
            'Companies with Warehouses': uniqueCompanies,
            'Average per Company': avgPerCompany,
            'Default Warehouses Set': bulkOps.length,
        });

    } catch (error) {
        logger.error('Failed to seed warehouses:', error);
        throw error;
    }
}

/**
 * Get warehouses for a company
 */
export async function getWarehousesForCompany(companyId: mongoose.Types.ObjectId) {
    return Warehouse.find({ companyId, isActive: true, isDeleted: false }).lean();
}

/**
 * Get default warehouse for a company
 */
export async function getDefaultWarehouse(companyId: mongoose.Types.ObjectId) {
    return Warehouse.findOne({ companyId, isDefault: true, isDeleted: false }).lean();
}

/**
 * Get all active warehouses
 */
export async function getAllActiveWarehouses() {
    return Warehouse.find({ isActive: true, isDeleted: false }).lean();
}
