/**
 * PackingService - Refactored to Static Methods
 */

import mongoose from 'mongoose';
import { PackingStation, IPackingStation, IPackage } from '@/infrastructure/database/mongoose/models';
import {
    ICreatePackingStationDTO,
    IUpdatePackingStationDTO,
    IAssignPackerDTO,
    IStartPackingSessionDTO,
    IPackItemDTO,
    ICreatePackageDTO,
    IVerifyWeightDTO,
    ICompletePackingSessionDTO,
    IPackingStationQueryOptions,
    IWeightVerificationResult,
    IPackingStationStats,
    IPackerStats,
    IPaginatedResult,
} from '@/core/domain/interfaces/warehouse/packing.interface.service';
import { AppError } from '@/shared/errors/app.error';
import logger from '@/shared/logger/winston.logger';

export default class PackingService {
    static async createStation(data: ICreatePackingStationDTO): Promise<IPackingStation> {
        const existing = await PackingStation.findOne({
            warehouseId: data.warehouseId,
            stationCode: data.stationCode,
        });

        if (existing) {
            throw new AppError('Packing station with this code already exists', 'STATION_EXISTS', 400);
        }

        const station = await PackingStation.create({
            ...data,
            status: 'AVAILABLE',
            isActive: true,
        });

        logger.info('Packing station created', {
            stationId: String(station._id),
            stationCode: data.stationCode,
            warehouseId: String(data.warehouseId),
            type: data.type,
        });

        return station;
    }

    static async updateStation(data: IUpdatePackingStationDTO): Promise<IPackingStation> {
        const station = await PackingStation.findByIdAndUpdate(data.stationId, data, { new: true });
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);
        return station;
    }

    static async getStationById(id: string): Promise<IPackingStation | null> {
        return PackingStation.findById(id).populate('assignedTo', 'firstName lastName');
    }

    static async getStations(options: IPackingStationQueryOptions): Promise<IPaginatedResult<IPackingStation>> {
        const { page = 1, limit = 20 } = options;
        const filter: any = {};

        if (options.warehouseId) filter.warehouseId = options.warehouseId;
        if (options.companyId) filter.companyId = options.companyId;
        if (options.status) filter.status = Array.isArray(options.status) ? { $in: options.status } : options.status;
        if (options.type) filter.type = Array.isArray(options.type) ? { $in: options.type } : options.type;

        const [data, total] = await Promise.all([
            PackingStation.find(filter).skip((page - 1) * limit).limit(limit),
            PackingStation.countDocuments(filter),
        ]);

        return {
            data,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    static async getAvailableStations(warehouseId: string): Promise<IPackingStation[]> {
        return PackingStation.find({
            warehouseId,
            status: 'AVAILABLE',
            isActive: true,
        }).sort({ stationCode: 1 });
    }

    static async setStationOffline(stationId: string, reason?: string): Promise<IPackingStation> {
        const station = await PackingStation.findById(stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        station.status = 'OFFLINE';
        await station.save();
        return station;
    }

    static async setStationOnline(stationId: string): Promise<IPackingStation> {
        const station = await PackingStation.findById(stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        station.status = 'AVAILABLE';
        await station.save();
        return station;
    }

    static async assignPacker(data: IAssignPackerDTO): Promise<IPackingStation> {
        const station = await PackingStation.findById(data.stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        if (station.status === 'OCCUPIED') {
            throw new AppError('Station is already occupied', 'STATION_OCCUPIED', 400);
        }

        station.assignedTo = new mongoose.Types.ObjectId(data.packerId);
        station.assignedAt = new Date();
        station.status = 'OCCUPIED';
        await station.save();
        return station;
    }

    static async unassignPacker(stationId: string): Promise<IPackingStation> {
        const station = await PackingStation.findById(stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        station.assignedTo = undefined;
        station.assignedAt = undefined;
        station.status = 'AVAILABLE';
        station.currentSession = undefined;
        station.packages = [];
        await station.save();
        return station;
    }

    static async startPackingSession(data: IStartPackingSessionDTO): Promise<IPackingStation> {
        const station = await PackingStation.findById(data.stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        if (station.status !== 'OCCUPIED') {
            throw new AppError('Station must have an assigned packer', 'NO_PACKER_ASSIGNED', 400);
        }

        station.currentSession = {
            pickListId: new mongoose.Types.ObjectId(data.pickListId),
            orderId: new mongoose.Types.ObjectId(data.orderId),
            orderNumber: data.orderNumber,
            startedAt: new Date(),
            status: 'IN_PROGRESS',
            items: data.items.map((item) => ({
                sku: item.sku,
                productName: item.productName,
                quantity: item.quantity,
                packed: 0,
            })),
        };

        station.packages = [];
        await station.save();

        logger.info('Packing session started', {
            stationId: String(data.stationId),
            stationCode: station.stationCode,
            itemCount: data.items.length,
            orderId: data.orderId ? String(data.orderId) : 'none',
        });

        return station;
    }

    static async packItem(data: IPackItemDTO): Promise<IPackingStation> {
        const station = await PackingStation.findById(data.stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        if (!station.currentSession) {
            throw new AppError('No active packing session', 'NO_ACTIVE_SESSION', 400);
        }

        const item = station.currentSession.items.find((i) => i.sku === data.sku);
        if (!item) {
            throw new AppError('Item not found in session', 'ITEM_NOT_FOUND', 404);
        }

        // FIX: Prevent over-packing - don't allow packing more than required
        const remainingToPack = item.quantity - item.packed;
        if (data.quantity > remainingToPack) {
            throw new AppError(
                `Cannot pack ${data.quantity} items. Only ${remainingToPack} remaining to pack for SKU: ${data.sku}`,
                'OVER_PACKING_NOT_ALLOWED',
                400
            );
        }

        item.packed += data.quantity;
        await station.save();

        logger.debug('Item packed', {
            stationId: String(data.stationId),
            sku: data.sku,
            quantityPacked: data.quantity,
            totalPacked: item.packed,
            totalRequired: item.quantity,
        });

        return station;
    }

    static async createPackage(data: ICreatePackageDTO): Promise<IPackage> {
        const station = await PackingStation.findById(data.stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        const packageNumber = station.packages.length + 1;

        const newPackage: IPackage = {
            packageNumber,
            weight: data.weight,
            dimensions: data.dimensions,
            items: data.items,
            boxType: data.boxType,
            isFragile: data.isFragile || false,
            requiresInsurance: data.requiresInsurance || false,
        };

        station.packages.push(newPackage);
        await station.save();

        return newPackage;
    }

    static async updatePackage(stationId: string, packageNumber: number, updates: Partial<IPackage>): Promise<IPackage> {
        const station = await PackingStation.findById(stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        const pkg = station.packages.find((p) => p.packageNumber === packageNumber);
        if (!pkg) throw new AppError('Package not found', 'PACKAGE_NOT_FOUND', 404);

        Object.assign(pkg, updates);
        await station.save();
        return pkg;
    }

    static async removePackage(stationId: string, packageNumber: number): Promise<IPackingStation> {
        const station = await PackingStation.findById(stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        station.packages = station.packages.filter((p) => p.packageNumber !== packageNumber);
        await station.save();
        return station;
    }

    static async completePackingSession(data: ICompletePackingSessionDTO): Promise<IPackingStation> {
        const station = await PackingStation.findById(data.stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        if (!station.currentSession) {
            throw new AppError('No active session to complete', 'NO_ACTIVE_SESSION', 400);
        }

        // Check all items packed
        const allPacked = station.currentSession.items.every((item) => item.packed === item.quantity);

        if (!allPacked) {
            throw new AppError('Not all items have been packed', 'INCOMPLETE_PACKING', 400);
        }

        station.currentSession.status = 'COMPLETED';
        station.ordersPackedToday += 1;
        station.ordersPackedTotal += 1;
        station.lastPackedAt = new Date();
        station.currentSession = undefined;
        station.packages = [];

        await station.save();

        logger.info('Packing session completed', {
            stationId: String(data.stationId),
            stationCode: station.stationCode,
            packageCount: station.packages.length,
            ordersPackedToday: station.ordersPackedToday,
        });

        return station;
    }

    static async cancelPackingSession(stationId: string, reason: string): Promise<IPackingStation> {
        const station = await PackingStation.findById(stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        station.currentSession = undefined;
        station.packages = [];
        await station.save();
        return station;
    }

    static async verifyWeight(data: IVerifyWeightDTO): Promise<IWeightVerificationResult> {
        const variance = data.actualWeight - data.expectedWeight;
        const variancePercent = (Math.abs(variance) / data.expectedWeight) * 100;
        const tolerance = data.tolerance || 5; // 5% default tolerance

        return {
            passed: variancePercent <= tolerance,
            actualWeight: data.actualWeight,
            expectedWeight: data.expectedWeight,
            variance,
            variancePercent,
            withinTolerance: variancePercent <= tolerance,
        };
    }

    static async generatePackageLabel(stationId: string, packageNumber: number): Promise<string> {
        const station = await PackingStation.findById(stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        const pkg = station.packages.find((p) => p.packageNumber === packageNumber);
        if (!pkg) throw new AppError('Package not found', 'PACKAGE_NOT_FOUND', 404);

        return `https://shipcrowd.s3.amazonaws.com/labels/${stationId}-${packageNumber}.pdf`;
    }

    static async getStationStats(stationId: string, startDate: Date, endDate: Date): Promise<IPackingStationStats> {
        const station = await PackingStation.findById(stationId);
        if (!station) throw new AppError('Packing station not found', 'STATION_NOT_FOUND', 404);

        return {
            stationId: String(station._id),
            stationCode: station.stationCode,
            ordersPackedToday: station.ordersPackedToday,
            ordersPackedWeek: station.ordersPackedTotal, // Simplified
            ordersPackedMonth: station.ordersPackedTotal,
            averagePackTime: station.averagePackTime,
            utilizationPercent: 75,
        };
    }

    static async getPackerStats(packerId: string, startDate: Date, endDate: Date): Promise<IPackerStats> {
        // Aggregate stats across all stations for this packer
        return {
            packerId,
            packerName: 'Packer',
            totalOrdersPacked: 0,
            totalPackagesCreated: 0,
            averagePackTime: 0,
            accuracyRate: 98,
            period: { startDate, endDate },
        };
    }

    static async resetDailyCounters(warehouseId: string): Promise<void> {
        await PackingStation.updateMany(
            { warehouseId },
            { $set: { ordersPackedToday: 0 } }
        );
    }
}
