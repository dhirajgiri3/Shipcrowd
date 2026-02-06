import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { guardChecks, requireCompanyContext } from '@/shared/helpers/controller.helpers';
import { DisputeResolutionService } from '@/core/application/services/crm/disputes/dispute-resolution.service';
import { sendSuccess, sendCreated, calculatePagination } from '@/shared/utils/responseHelper';
import { AuthenticationError, ValidationError } from '@/shared/errors';
import logger from '@/shared/logger/winston.logger';
import mongoose from 'mongoose';

const disputeService = new DisputeResolutionService();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createDisputeSchema = z.object({
  type: z.enum(['damaged-goods', 'lost-shipment', 'delayed-delivery', 'quality-issue']),
  description: z.string().min(10).max(2000),
  relatedOrderId: z.string().optional(),
  relatedSupportTicketId: z.string().optional(),
  relatedShipmentId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const startInvestigationSchema = z.object({
  assignedToId: z.string(),
  initialNotes: z.string().min(5).max(3000),
});

const completeInvestigationSchema = z.object({
  completionNotes: z.string().min(5).max(3000),
});

const resolveDisputeSchema = z.object({
  resolution: z.enum(['refund', 'replacement', 'partial-refund', 'no-action']),
  refundAmount: z.number().min(0).optional(),
  notes: z.string().min(5).max(2000),
});

const addEvidenceSchema = z.object({
  type: z.enum(['photo', 'video', 'document', 'audio', 'other']),
  url: z.string().url(),
});

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * Create a new dispute
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const validation = createDisputeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const disputeData: any = {
      company: new mongoose.Types.ObjectId(auth.companyId),
      ...validation.data,
    };

    if (validation.data.relatedSupportTicketId) {
      disputeData.relatedSupportTicketId = new mongoose.Types.ObjectId(
        validation.data.relatedSupportTicketId
      );
    }

    if (validation.data.relatedShipmentId) {
      disputeData.relatedShipmentId = new mongoose.Types.ObjectId(
        validation.data.relatedShipmentId
      );
    }

    const dispute = await disputeService.createDispute(disputeData);

    sendCreated(res, dispute, 'Dispute created successfully');
  } catch (error) {
    logger.error('Error creating dispute:', error);
    next(error);
  }
};

/**
 * Get all disputes for a company
 */
export const findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const filters = {
      status: req.query.status,
      type: req.query.type,
      priority: req.query.priority,
      assignedTo: req.query.assignedTo,
    };

    const result = await disputeService.getDisputes(auth.companyId, filters, page, limit);

    const pagination = calculatePagination(result.total, page, limit);

    res.status(200).json({
      success: true,
      data: {
        disputes: result.disputes,
        pagination,
      },
      message: 'Disputes retrieved successfully',
    });
  } catch (error) {
    logger.error('Error fetching disputes:', error);
    next(error);
  }
};

/**
 * Get a specific dispute by ID
 */
export const findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const { id } = req.params;
    if (!id) {
      throw new ValidationError('Dispute ID is required');
    }

    const dispute = await disputeService.getDisputeById(id);

    // Verify company access
    if (dispute.company.toString() !== auth.companyId) {
      throw new AuthenticationError('Access denied');
    }

    sendSuccess(res, dispute, 'Dispute retrieved successfully');
  } catch (error) {
    logger.error('Error fetching dispute:', error);
    next(error);
  }
};

/**
 * Start investigation on a dispute
 */
export const startInvestigation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const { id } = req.params;
    if (!id) {
      throw new ValidationError('Dispute ID is required');
    }

    const validation = startInvestigationSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const dispute = await disputeService.startInvestigation(
      id,
      validation.data.assignedToId,
      validation.data.initialNotes
    );

    sendSuccess(res, dispute, 'Investigation started successfully');
  } catch (error) {
    logger.error('Error starting investigation:', error);
    next(error);
  }
};

/**
 * Complete investigation on a dispute
 */
export const completeInvestigation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = guardChecks(req);

    const { id } = req.params;
    if (!id) {
      throw new ValidationError('Dispute ID is required');
    }

    const validation = completeInvestigationSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const dispute = await disputeService.completeInvestigation(
      id,
      validation.data.completionNotes,
      auth.userId
    );

    sendSuccess(res, dispute, 'Investigation completed successfully');
  } catch (error) {
    logger.error('Error completing investigation:', error);
    next(error);
  }
};

/**
 * Resolve a dispute
 */
export const resolve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);

    const { id } = req.params;
    if (!id) {
      throw new ValidationError('Dispute ID is required');
    }

    const validation = resolveDisputeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const dispute = await disputeService.resolveDispute(
      id,
      validation.data.resolution,
      validation.data.refundAmount || 0,
      validation.data.notes,
      auth.userId
    );

    sendSuccess(res, dispute, 'Dispute resolved successfully');
  } catch (error) {
    logger.error('Error resolving dispute:', error);
    next(error);
  }
};

/**
 * Add evidence to a dispute
 */
export const addEvidence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);

    const { id } = req.params;
    if (!id) {
      throw new ValidationError('Dispute ID is required');
    }

    const validation = addEvidenceSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const dispute = await disputeService.addEvidence(
      id,
      validation.data.type,
      validation.data.url,
      auth.userId
    );

    sendSuccess(res, dispute, 'Evidence added successfully');
  } catch (error) {
    logger.error('Error adding evidence:', error);
    next(error);
  }
};

/**
 * Get open disputes for a company
 */
export const getOpenDisputes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const disputes = await disputeService.getOpenDisputes(auth.companyId);

    sendSuccess(res, { disputes, count: disputes.length }, 'Open disputes retrieved successfully');
  } catch (error) {
    logger.error('Error fetching open disputes:', error);
    next(error);
  }
};

/**
 * Get dispute metrics by type
 */
export const getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const metrics = await disputeService.getMetricsByType(auth.companyId);

    sendSuccess(res, { metrics }, 'Dispute metrics retrieved successfully');
  } catch (error) {
    logger.error('Error fetching dispute metrics:', error);
    next(error);
  }
};

/**
 * Get resolution summary
 */
export const getResolutionSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const { from, to } = req.query;
    const dateFrom = from ? new Date(from as string) : undefined;
    const dateTo = to ? new Date(to as string) : undefined;

    const summary = await disputeService.getResolutionSummary(
      auth.companyId,
      dateFrom,
      dateTo
    );

    sendSuccess(res, { summary }, 'Resolution summary retrieved successfully');
  } catch (error) {
    logger.error('Error fetching resolution summary:', error);
    next(error);
  }
};

export default {
  create,
  findAll,
  findById,
  startInvestigation,
  completeInvestigation,
  resolve,
  addEvidence,
  getOpenDisputes,
  getMetrics,
  getResolutionSummary,
};
