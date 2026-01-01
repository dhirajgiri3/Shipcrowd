/**
 * PackingController
 * 
 * Handles all packing station and packing workflow HTTP endpoints
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth/auth';
import * as packingService from '@/core/application/services/warehouse';
import { createAuditLog } from '@/presentation/http/middleware/system/auditLog';
import {
    sendSuccess,
    sendError,
    sendCreated,
    sendPaginated,
    sendValidationError,
} from '@/shared/utils/responseHelper';
import {
    createPackingStationSchema,
    startPackingSessionSchema,
    createPackageSchema,
    verifyWeightSchema,
    assignPackerSchema,
    setStationOfflineSchema,
    packItemSchema,
    completePackingSessionSchema,
    cancelPackingSessionSchema,
} from '@/shared/validation/warehouse.schemas';
import { guardChecks, parsePagination, validateObjectId } from '@/shared/helpers/controller.helpers';

/**
 * Create packing station
 * POST /api/v1/packing/stations
 */
async function createStation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const validation = createPackingStationSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const station = await packingService.createStation({
            ...validation.data,
            companyId: auth.companyId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'create',
            'packing_station',
            String(station._id),
            { stationCode: station.stationCode },
            req
        );

        sendCreated(res, station, 'Packing station created');
    } catch (error) {
        next(error);
    }
}

/**
 * Get packing stations
 * GET /api/v1/packing/stations
 */
async function getStations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { warehouseId, status, type } = req.query;
        const pagination = parsePagination(req.query);

        const result = await packingService.getStations({
            companyId: auth.companyId,
            warehouseId: warehouseId as string,
            status: status as string,
            type: type as string,
            page: pagination.page,
            limit: pagination.limit,
        });

        sendPaginated(res, result.data, result.pagination, 'Packing stations retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get station by ID
 * GET /api/v1/packing/stations/:id
 */
async function getStationById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const station = await packingService.getStationById(id);

        if (!station) {
            sendError(res, 'Packing station not found', 404, 'STATION_NOT_FOUND');
            return;
        }

        sendSuccess(res, station, 'Station retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get available stations
 * GET /api/v1/packing/stations/available/:warehouseId
 */
async function getAvailableStations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { warehouseId } = req.params;
        const stations = await packingService.getAvailableStations(warehouseId);

        sendSuccess(res, stations, 'Available stations retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Assign packer to station
 * POST /api/v1/packing/stations/:id/assign
 */
async function assignPacker(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const validation = assignPackerSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const station = await packingService.assignPacker({
            stationId: id,
            packerId: validation.data.packerId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'packing_station',
            id,
            { action: 'assign_packer', packerId: validation.data.packerId },
            req
        );

        sendSuccess(res, station, 'Packer assigned to station');
    } catch (error) {
        next(error);
    }
}

/**
 * Unassign packer from station
 * POST /api/v1/packing/stations/:id/unassign
 */
async function unassignPacker(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const station = await packingService.unassignPacker(id);

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'packing_station',
            id,
            { action: 'unassign_packer' },
            req
        );

        sendSuccess(res, station, 'Packer unassigned from station');
    } catch (error) {
        next(error);
    }
}

/**
 * Set station offline
 * POST /api/v1/packing/stations/:id/offline
 */
async function setOffline(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const validation = setStationOfflineSchema.safeParse(req.body);
        const reason = validation.success ? validation.data.reason : undefined;

        const station = await packingService.setStationOffline(id, reason);

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'packing_station',
            id,
            { action: 'set_offline', reason },
            req
        );

        sendSuccess(res, station, 'Station set offline');
    } catch (error) {
        next(error);
    }
}

/**
 * Set station online
 * POST /api/v1/packing/stations/:id/online
 */
async function setOnline(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const station = await packingService.setStationOnline(id);

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'packing_station',
            id,
            { action: 'set_online' },
            req
        );

        sendSuccess(res, station, 'Station set online');
    } catch (error) {
        next(error);
    }
}

/**
 * Start packing session
 * POST /api/v1/packing/stations/:id/session/start
 */
async function startSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const validation = startPackingSessionSchema.safeParse(req.body);

        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const station = await packingService.startPackingSession({
            stationId: id,
            packerId: auth.userId,
            ...validation.data,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'packing_station',
            id,
            { action: 'start_session', pickListId: validation.data.pickListId },
            req
        );

        sendSuccess(res, station, 'Packing session started');
    } catch (error) {
        next(error);
    }
}

/**
 * Pack an item
 * POST /api/v1/packing/stations/:id/pack
 */
async function packItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const validation = packItemSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const station = await packingService.packItem({
            stationId: id,
            ...validation.data,
        });

        sendSuccess(res, station, 'Item packed');
    } catch (error) {
        next(error);
    }
}

/**
 * Create package
 * POST /api/v1/packing/stations/:id/packages
 */
async function createPackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const validation = createPackageSchema.safeParse(req.body);

        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const pkg = await packingService.createPackage({
            stationId: id,
            ...validation.data,
        });

        sendCreated(res, pkg, 'Package created');
    } catch (error) {
        next(error);
    }
}

/**
 * Verify weight
 * POST /api/v1/packing/stations/:id/verify-weight
 */
async function verifyWeight(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const validation = verifyWeightSchema.safeParse(req.body);

        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const result = await packingService.verifyWeight({
            stationId: id,
            ...validation.data,
        });

        sendSuccess(res, result, result.passed ? 'Weight verified' : 'Weight variance detected');
    } catch (error) {
        next(error);
    }
}

/**
 * Complete packing session
 * POST /api/v1/packing/stations/:id/session/complete
 */
async function completeSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'packing station')) return;

        const validation = completePackingSessionSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { notes } = validation.data;

        const station = await packingService.completePackingSession({
            stationId: id,
            packerId: auth.userId,
            notes,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'packing_station',
            id,
            { action: 'complete_session' },
            req
        );

        sendSuccess(res, station, 'Packing session completed');
    } catch (error) {
        next(error);
    }
}

/**
 * Cancel packing session
 * POST /api/v1/packing/stations/:id/session/cancel
 */
async function cancelSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        const validation = cancelPackingSessionSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { reason } = validation.data;

        const station = await packingService.cancelPackingSession(id, reason);

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'packing_station',
            id,
            { action: 'cancel_session', reason },
            req
        );

        sendSuccess(res, station, 'Packing session cancelled');
    } catch (error) {
        next(error);
    }
}

/**
 * Generate package label
 * GET /api/v1/packing/stations/:id/packages/:packageNumber/label
 */
async function getPackageLabel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id, packageNumber } = req.params;
        const labelUrl = await packingService.generatePackageLabel(id, parseInt(packageNumber, 10));

        sendSuccess(res, { labelUrl }, 'Label generated');
    } catch (error) {
        next(error);
    }
}

/**
 * Get station statistics
 * GET /api/v1/packing/stats/station/:stationId
 */
async function getStationStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { stationId } = req.params;
        const { startDate, endDate } = req.query;

        const stats = await packingService.getStationStats(
            stationId,
            new Date(startDate as string || Date.now() - 7 * 24 * 60 * 60 * 1000),
            new Date(endDate as string || Date.now())
        );

        sendSuccess(res, stats, 'Station stats retrieved');
    } catch (error) {
        next(error);
    }
}

export default {
    createStation,
    getStations,
    getStationById,
    getAvailableStations,
    assignPacker,
    unassignPacker,
    setOffline,
    setOnline,
    startSession,
    packItem,
    createPackage,
    verifyWeight,
    completeSession,
    cancelSession,
    getPackageLabel,
    getStationStats,
};
