/**
 * PickingController
 * 
 * Handles all pick list and picking workflow HTTP endpoints
 */

import { Request, Response, NextFunction } from 'express';
import PickingService from "@/core/application/services/warehouse/picking.service";
import { createAuditLog } from '@/presentation/http/middleware/system/audit-log.middleware';
import {
    sendSuccess,
    sendError,
    sendCreated,
    sendPaginated,
    sendValidationError,
} from '@/shared/utils/responseHelper';
import {
    createPickListSchema,
    assignPickListSchema,
    pickItemSchema,
    skipItemSchema,
    completePickListSchema,
    cancelPickListSchema,
    verifyPickListSchema,
} from '@/shared/validation/warehouse.schemas';
import { guardChecks, parsePagination, validateObjectId } from '@/shared/helpers/controller.helpers';

/**
 * Create a new pick list
 * POST /api/v1/picking/pick-lists
 */
async function createPickList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const validation = createPickListSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const pickList = await PickingService.createPickList({
            ...validation.data,
            companyId: auth.companyId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'create',
            'picklist',
            String(pickList._id),
            { pickListNumber: pickList.pickListNumber },
            req
        );

        sendCreated(res, pickList, 'Pick list created successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Get pick lists with pagination
 * GET /api/v1/picking/pick-lists
 */
async function getPickLists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { warehouseId, status, assignedTo, priority } = req.query;
        const pagination = parsePagination(req.query);

        const result = await PickingService.getPickLists({
            companyId: auth.companyId,
            warehouseId: warehouseId as string,
            status: status as string,
            assignedTo: assignedTo as string,
            priority: priority as string,
            page: pagination.page,
            limit: pagination.limit,
        });

        sendPaginated(res, result.data, result.pagination, 'Pick lists retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get pick list by ID
 * GET /api/v1/picking/pick-lists/:id
 */
async function getPickListById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res, 'pick list')) return;

        const pickList = await PickingService.getPickListById(id);

        if (!pickList) {
            sendError(res, 'Pick list not found', 404, 'PICKLIST_NOT_FOUND');
            return;
        }

        sendSuccess(res, pickList, 'Pick list retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get pick lists assigned to current user (picker)
 * GET /api/v1/picking/my-pick-lists
 */
async function getMyPickLists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { status } = req.query;

        const pickLists = await PickingService.getPickListsByPicker(
            auth.userId,
            status as string
        );

        sendSuccess(res, pickLists, 'My pick lists retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Assign pick list to picker
 * POST /api/v1/picking/pick-lists/:id/assign
 */
async function assignPickList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'pick list')) return;

        const validation = assignPickListSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const pickList = await PickingService.assignPickList({
            pickListId: id,
            pickerId: validation.data.pickerId,
            assignedBy: auth.userId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'picklist',
            id,
            { action: 'assign', pickerId: validation.data.pickerId },
            req
        );

        sendSuccess(res, pickList, 'Pick list assigned successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Start picking
 * POST /api/v1/picking/pick-lists/:id/start
 */
async function startPicking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'pick list')) return;

        const pickList = await PickingService.startPicking({
            pickListId: id,
            pickerId: auth.userId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'picklist',
            id,
            { action: 'start_picking' },
            req
        );

        sendSuccess(res, pickList, 'Picking started');
    } catch (error) {
        next(error);
    }
}

/**
 * Pick an item
 * POST /api/v1/picking/pick-lists/:id/pick
 */
async function pickItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res, 'pick list')) return;

        const validation = pickItemSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const pickList = await PickingService.pickItem({
            pickListId: id,
            ...validation.data,
        });

        // Note: We don't audit log every item pick to avoid noise, only major status changes

        sendSuccess(res, pickList, 'Item picked successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Skip an item
 * POST /api/v1/picking/pick-lists/:id/skip
 */
async function skipItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'pick list')) return;

        const validation = skipItemSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { itemId, reason } = validation.data;

        const pickList = await PickingService.skipItem(id, itemId, reason);

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'picklist',
            id,
            { action: 'skip_item', itemId, reason },
            req
        );

        sendSuccess(res, pickList, 'Item skipped');
    } catch (error) {
        next(error);
    }
}

/**
 * Complete pick list
 * POST /api/v1/picking/pick-lists/:id/complete
 */
async function completePickList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'pick list')) return;

        const validation = completePickListSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { pickerNotes } = validation.data;

        const pickList = await PickingService.completePickList({
            pickListId: id,
            pickerId: auth.userId,
            pickerNotes,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'picklist',
            id,
            { action: 'complete', status: pickList.status },
            req
        );

        sendSuccess(res, pickList, 'Pick list completed');
    } catch (error) {
        next(error);
    }
}

/**
 * Cancel pick list
 * POST /api/v1/picking/pick-lists/:id/cancel
 */
async function cancelPickList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'pick list')) return;

        const validation = cancelPickListSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { reason } = validation.data;

        const pickList = await PickingService.cancelPickList({
            pickListId: id,
            cancelledBy: auth.userId,
            reason,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'picklist',
            id,
            { action: 'cancel', reason },
            req
        );

        sendSuccess(res, pickList, 'Pick list cancelled');
    } catch (error) {
        next(error);
    }
}

/**
 * Verify pick list
 * POST /api/v1/picking/pick-lists/:id/verify
 */
async function verifyPickList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'pick list')) return;

        const validation = verifyPickListSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { passed, notes } = validation.data;

        const pickList = await PickingService.verifyPickList({
            pickListId: id,
            verifierId: auth.userId,
            passed,
            notes,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'picklist',
            id,
            { action: 'verify', passed },
            req
        );

        sendSuccess(res, pickList, 'Pick list verified');
    } catch (error) {
        next(error);
    }
}

/**
 * Get next item suggestion
 * GET /api/v1/picking/pick-lists/:id/next-item
 */
async function getNextItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const item = await PickingService.suggestNextItem(id);

        sendSuccess(res, item, item ? 'Next item suggested' : 'No more items');
    } catch (error) {
        next(error);
    }
}

/**
 * Get picker statistics
 * GET /api/v1/picking/stats/picker/:pickerId
 */
async function getPickerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { pickerId } = req.params;
        const { startDate, endDate } = req.query;

        const stats = await PickingService.getPickerStats(
            pickerId,
            new Date(startDate as string || Date.now() - 7 * 24 * 60 * 60 * 1000),
            new Date(endDate as string || Date.now())
        );

        sendSuccess(res, stats, 'Picker stats retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get warehouse pick list statistics
 * GET /api/v1/picking/stats/warehouse/:warehouseId
 */
async function getWarehouseStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { warehouseId } = req.params;
        const { startDate, endDate } = req.query;

        const stats = await PickingService.getPickListStats(
            warehouseId,
            new Date(startDate as string || Date.now() - 7 * 24 * 60 * 60 * 1000),
            new Date(endDate as string || Date.now())
        );

        sendSuccess(res, stats, 'Warehouse pick stats retrieved');
    } catch (error) {
        next(error);
    }
}

export default {
    createPickList,
    getPickLists,
    getPickListById,
    getMyPickLists,
    assignPickList,
    startPicking,
    pickItem,
    skipItem,
    completePickList,
    cancelPickList,
    verifyPickList,
    getNextItem,
    getPickerStats,
    getWarehouseStats,
};
