/**
 * Warehouse Configuration Seeder
 * 
 * Seeds warehouse structure data:
 * - WarehouseZones: 3-5 zones per warehouse (storage, picking, packing, etc.)
 * - WarehouseLocations: 10-30 locations per zone (bins)
 * - PackingStations: 2-5 stations per warehouse
 */

import mongoose from 'mongoose';
import PackingStation from '../../mongoose/models/logistics/warehouse/activities/packing-station.model';
import WarehouseLocation from '../../mongoose/models/logistics/warehouse/structure/warehouse-location.model';
import WarehouseZone from '../../mongoose/models/logistics/warehouse/structure/warehouse-zone.model';
import Warehouse from '../../mongoose/models/logistics/warehouse/structure/warehouse.model';
import { subDays } from '../utils/date.utils';
import { createTimer, logger } from '../utils/logger.utils';
import { randomInt, selectRandom, selectWeightedFromObject } from '../utils/random.utils';

// Zone types distribution
const ZONE_TYPE_DISTRIBUTION = {
    STORAGE: 40,
    PICKING: 25,
    PACKING: 15,
    RECEIVING: 10,
    DISPATCH: 10,
};

// Temperature distribution
const TEMPERATURE_DISTRIBUTION = {
    AMBIENT: 85,
    COLD: 10,
    FROZEN: 5,
};

// Station type distribution
const STATION_TYPE_DISTRIBUTION = {
    STANDARD: 50,
    FRAGILE: 15,
    OVERSIZED: 15,
    EXPRESS: 15,
    MULTI_ITEM: 5,
};

// Location status distribution
const LOCATION_STATUS_DISTRIBUTION = {
    AVAILABLE: 40,
    OCCUPIED: 45,
    RESERVED: 10,
    BLOCKED: 3,
    MAINTENANCE: 2,
};

// Common box sizes
const BOX_SIZES = ['SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'CUSTOM'];

// Authorized roles
const AUTHORIZED_ROLES = ['WAREHOUSE_MANAGER', 'PICKER', 'PACKER', 'SUPERVISOR'];
void AUTHORIZED_ROLES;

/**
 * Generate a zone code
 */
function generateZoneCode(type: string, index: number): string {
    const typePrefix: Record<string, string> = {
        STORAGE: 'ST',
        PICKING: 'PK',
        PACKING: 'PA',
        RECEIVING: 'RC',
        DISPATCH: 'DS',
        RETURNS: 'RT',
        QUALITY_CHECK: 'QC',
    };
    return `${typePrefix[type] || 'Z'}${String(index + 1).padStart(2, '0')}`;
}

/**
 * Generate zone name
 */
function generateZoneName(type: string, index: number): string {
    return `${type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')} Zone ${index + 1}`;
}

/**
 * Generate a warehouse zone
 */
function generateZone(warehouseId: mongoose.Types.ObjectId, index: number): any {
    const type = selectWeightedFromObject(ZONE_TYPE_DISTRIBUTION);
    const temperature = selectWeightedFromObject(TEMPERATURE_DISTRIBUTION);
    const aisles = randomInt(3, 5);
    const racksPerAisle = randomInt(4, 10);
    const shelvesPerRack = randomInt(3, 6);
    const binsPerShelf = randomInt(2, 4);
    const totalLocations = aisles * racksPerAisle * shelvesPerRack * binsPerShelf;

    return {
        warehouseId,
        name: generateZoneName(type, index),
        code: generateZoneCode(type, index),
        type,
        aisles,
        racksPerAisle,
        shelvesPerRack,
        binsPerShelf,
        temperature,
        isClimateControlled: temperature !== 'AMBIENT',
        temperatureMin: temperature === 'COLD' ? 2 : temperature === 'FROZEN' ? -18 : undefined,
        temperatureMax: temperature === 'COLD' ? 8 : temperature === 'FROZEN' ? -12 : undefined,
        requiresAuthorization: temperature !== 'AMBIENT',
        authorizedRoles: temperature !== 'AMBIENT' ? ['WAREHOUSE_MANAGER', 'SUPERVISOR'] : undefined,
        totalLocations,
        occupiedLocations: Math.floor(totalLocations * (randomInt(30, 80) / 100)),
        isHighVelocity: type === 'PICKING' && Math.random() > 0.5,
        isHazardous: false,
        isFragile: type === 'STORAGE' && Math.random() > 0.8,
        maxWeight: type === 'STORAGE' ? randomInt(50, 200) : randomInt(20, 50),
        isActive: true,
        isDeleted: false,
    };
}

/**
 * Generate warehouse locations for a zone
 */
function generateLocations(
    warehouseId: mongoose.Types.ObjectId,
    zone: any
): any[] {
    const locations: any[] = [];
    let pickSequence = 0;

    for (let aisle = 1; aisle <= zone.aisles; aisle++) {
        for (let rack = 1; rack <= zone.racksPerAisle; rack++) {
            for (let shelf = 1; shelf <= zone.shelvesPerRack; shelf++) {
                for (let bin = 1; bin <= zone.binsPerShelf; bin++) {
                    const aisleCode = String(aisle).padStart(2, '0');
                    const rackCode = String(rack).padStart(2, '0');
                    const shelfCode = String(shelf).padStart(2, '0');
                    const binCode = String(bin).padStart(2, '0');
                    const locationCode = `${zone.code}-${aisleCode}-${rackCode}-${shelfCode}-${binCode}`;

                    const status = selectWeightedFromObject(LOCATION_STATUS_DISTRIBUTION);
                    const isOccupied = status === 'OCCUPIED';
                    const currentStock = isOccupied ? randomInt(1, 50) : 0;

                    locations.push({
                        zoneId: zone._id,
                        warehouseId,
                        locationCode,
                        aisle: aisleCode,
                        rack: rackCode,
                        shelf: shelfCode,
                        bin: binCode,
                        type: 'BIN',
                        status,
                        maxWeight: randomInt(20, 50),
                        maxVolume: randomInt(50000, 150000),
                        currentWeight: isOccupied ? randomInt(1, 30) : 0,
                        currentVolume: isOccupied ? randomInt(10000, 80000) : 0,
                        currentSKU: isOccupied ? `SKU-${randomInt(1000, 9999)}` : undefined,
                        currentStock,
                        isDedicated: Math.random() > 0.9,
                        allowMixedSKUs: Math.random() > 0.7,
                        isPickFace: zone.type === 'PICKING' && shelf <= 2,
                        pickPriority: zone.type === 'PICKING' ? randomInt(1, 10) : 5,
                        pickSequence: zone.type === 'PICKING' ? pickSequence++ : 0,
                        isActive: true,
                        isBlocked: status === 'BLOCKED',
                        blockReason: status === 'BLOCKED' ? 'Awaiting inspection' : undefined,
                        lastPickedAt: isOccupied && zone.type === 'PICKING' ? subDays(new Date(), randomInt(0, 7)) : undefined,
                        lastReplenishedAt: isOccupied ? subDays(new Date(), randomInt(0, 14)) : undefined,
                    });
                }
            }
        }
    }

    return locations;
}

/**
 * Generate packing station
 */
function generatePackingStation(
    warehouseId: mongoose.Types.ObjectId,
    companyId: mongoose.Types.ObjectId,
    zoneId: mongoose.Types.ObjectId | undefined,
    index: number
): any {
    const type = selectWeightedFromObject(STATION_TYPE_DISTRIBUTION);
    const status = Math.random() > 0.2 ? 'AVAILABLE' : selectRandom(['OCCUPIED', 'OFFLINE', 'MAINTENANCE']);

    return {
        warehouseId,
        companyId,
        stationCode: `PS-${String(index + 1).padStart(3, '0')}`,
        name: `${type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')} Packing Station ${index + 1}`,
        type,
        zoneId,
        locationDescription: `Packing area, station ${index + 1}`,
        status,
        isActive: status !== 'OFFLINE',
        hasScale: true,
        hasScanner: true,
        hasPrinter: true,
        hasLabelPrinter: true,
        scaleMaxWeight: type === 'OVERSIZED' ? 100 : 50,
        scaleMinWeight: 0.01,
        scalePrecision: 2,
        supportedBoxSizes: type === 'OVERSIZED'
            ? ['LARGE', 'XLARGE', 'CUSTOM']
            : type === 'FRAGILE'
                ? ['SMALL', 'MEDIUM', 'CUSTOM']
                : BOX_SIZES,
        ordersPackedToday: randomInt(0, 50),
        ordersPackedTotal: randomInt(100, 10000),
        averagePackTime: randomInt(2, 8),
        lastPackedAt: status === 'AVAILABLE' ? subDays(new Date(), randomInt(0, 1)) : undefined,
    };
}

/**
 * Main seeder function
 */
export async function seedWarehouseConfig(): Promise<void> {
    const timer = createTimer();
    logger.step(20, 'Seeding Warehouse Configuration (Zones, Locations, Packing Stations)');

    try {
        const warehouses = await Warehouse.find({ isActive: true, isDeleted: false }).lean();

        if (warehouses.length === 0) {
            logger.warn('No active warehouses found. Skipping warehouse config seeder.');
            return;
        }

        const zones: any[] = [];
        const locations: any[] = [];
        const packingStations: any[] = [];

        for (const warehouse of warehouses) {
            const wh = warehouse as any;
            // Generate 3-5 zones per warehouse
            const zoneCount = randomInt(3, 5);
            const warehouseZones: any[] = [];

            for (let i = 0; i < zoneCount; i++) {
                // Adjust aisle count to 3-5 in generateZone function instead of here?
                // Actually internal implementation of generateZone uses randomInt(2, 6).
                // Let's rely on generateZone modification if I can, OR just update lines 88.
                // But I am replacing the block where locations are generated.

                const zone = generateZone(wh._id, i);
                warehouseZones.push(zone);
                zones.push(zone);
            }

            // Insert zones first to get IDs
            const insertedZones = await WarehouseZone.insertMany(warehouseZones, { ordered: false }).catch((err) => {
                if (err.code !== 11000) throw err;
                logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate zones`);
                return err.insertedDocs || [];
            });

            // Generate locations for each zone (remove artificial limits)
            for (const zone of insertedZones) {
                const zoneLocations = generateLocations(wh._id, zone);
                locations.push(...zoneLocations);
            }

            // Generate 2-5 packing stations per warehouse
            const packingZone = insertedZones.find((z: any) => z.type === 'PACKING');
            const stationCount = randomInt(2, 5);

            for (let i = 0; i < stationCount; i++) {
                packingStations.push(generatePackingStation(
                    wh._id,
                    wh.companyId,
                    packingZone?._id,
                    packingStations.length
                ));
            }
        }

        // Insert locations in batches
        if (locations.length > 0) {
            const batchSize = 500;
            for (let i = 0; i < locations.length; i += batchSize) {
                const batch = locations.slice(i, i + batchSize);
                await WarehouseLocation.insertMany(batch, { ordered: false }).catch((err) => {
                    if (err.code !== 11000) throw err;
                });
                logger.progress(Math.min(i + batchSize, locations.length), locations.length, 'Locations');
            }
        }

        // Insert packing stations
        if (packingStations.length > 0) {
            await PackingStation.insertMany(packingStations, { ordered: false }).catch((err) => {
                if (err.code !== 11000) throw err;
                logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate packing stations`);
            });
        }

        logger.complete('warehouse-config', zones.length + locations.length + packingStations.length, timer.elapsed());
        logger.table({
            'Warehouse Zones': zones.length,
            'Warehouse Locations': locations.length,
            'Packing Stations': packingStations.length,
            'Total Records': zones.length + locations.length + packingStations.length,
        });

    } catch (error) {
        logger.error('Failed to seed warehouse config:', error);
        throw error;
    }
}
