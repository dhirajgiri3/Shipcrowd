/**
 * Packing Factory
 * Creates test data for PackingStation and Package models
 */
import mongoose from 'mongoose';
import {
    randomString,
    randomNumeric,
} from '../helpers/randomData';

// Import models lazily
const getPackingStationModel = () => mongoose.model('PackingStation');

export interface CreatePackingStationOptions {
    warehouseId?: string;
    companyId?: string;
    warehouseName?: string;
    stationCode?: string;
    status?: 'AVAILABLE' | 'OCCUPIED' | 'OFFLINE' | 'MAINTENANCE';
    isActive?: boolean;
    assignedTo?: string;
}

/**
 * Create a test packing station
 */
export const createTestPackingStation = async (
    overrides: CreatePackingStationOptions = {}
): Promise<any> => {
    const PackingStation = getPackingStationModel();

    const stationData = {
        warehouseId: overrides.warehouseId || new mongoose.Types.ObjectId(),
        companyId: overrides.companyId || new mongoose.Types.ObjectId(),
        stationCode: overrides.stationCode || `PS-${randomNumeric(3)}`,
        name: `Station ${randomString(3)}`,
        type: 'STANDARD',
        status: overrides.status || 'AVAILABLE',
        isActive: overrides.isActive ?? true,
        capabilities: {
            hasScale: true,
            hasScanner: true,
            hasPrinter: true,
            hasLabelPrinter: true,
            supportedBoxSizes: ['S', 'M', 'L']
        },
        assignedTo: overrides.assignedTo ? new mongoose.Types.ObjectId(overrides.assignedTo) : undefined,
        assignedAt: overrides.assignedTo ? new Date() : undefined,
        currentSession: overrides.status === 'OCCUPIED' ? {
            pickListId: new mongoose.Types.ObjectId(),
            orderId: new mongoose.Types.ObjectId(),
            orderNumber: `ORD-${randomNumeric(6)}`,
            startedAt: new Date(),
            status: 'IN_PROGRESS',
            items: []
        } : undefined,
        stats: {
            ordersPackedToday: 0,
            ordersPackedTotal: 0,
            averagePackTime: 0
        },
        ...overrides
    };

    return PackingStation.create(stationData);
};
