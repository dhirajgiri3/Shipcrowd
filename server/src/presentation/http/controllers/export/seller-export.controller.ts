import { createReadStream, promises as fs } from 'fs';
import mongoose from 'mongoose';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { SellerExportJob } from '../../../../infrastructure/database/mongoose/models';
import { SellerExportJobProcessor } from '../../../../infrastructure/jobs/system/seller-export.job';
import SellerExportService, { SellerExportModule } from '../../../../core/application/services/export/seller-export.service';
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { isCompanyAdmin, isCompanyOwner } from '../../../../shared/utils/role-helpers';

const exportSchema = z.object({
  module: z.enum([
    'orders',
    'shipments',
    'cod_remittance_pending',
    'cod_remittance_history',
    'wallet_transactions',
    'returns',
    'ndr',
    'rto',
    'cod_discrepancies',
    'audit_logs',
    'analytics_dashboard',
    'pincode_checker',
    'bulk_address_validation',
  ]),
  filters: z.record(z.unknown()).optional(),
});

const ASYNC_EXPORT_ROW_THRESHOLD = 10000;

export const exportSellerModule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    const module: SellerExportModule = parsed.data.module;
    const filters = parsed.data.filters || {};

    const user: any = req.user || {};
    const canViewPii = isCompanyOwner(user) || isCompanyAdmin(user);

    const estimatedRowCount = await SellerExportService.estimateRowCount(module, filters, {
      companyId: auth.companyId,
      canViewPii,
    });

    if (estimatedRowCount > ASYNC_EXPORT_ROW_THRESHOLD) {
      const exportJob = await SellerExportJob.create({
        companyId: new mongoose.Types.ObjectId(auth.companyId),
        userId: new mongoose.Types.ObjectId(auth.userId),
        module,
        filters,
        canViewPii,
        status: 'pending',
        progress: 0,
        estimatedRowCount,
        rowCount: 0,
      });

      try {
        await SellerExportJobProcessor.queueExport({
          exportJobId: String(exportJob._id),
          companyId: auth.companyId,
          module,
          filters,
          canViewPii,
        });
      } catch (queueError: any) {
        await SellerExportJob.findByIdAndUpdate(exportJob._id, {
          status: 'failed',
          progress: 100,
          errorMessage: queueError?.message || 'Failed to queue export job',
          completedAt: new Date(),
        });
        throw queueError;
      }

      sendSuccess(
        res,
        {
          mode: 'async',
          jobId: String(exportJob._id),
          status: 'pending',
          estimatedRowCount,
          threshold: ASYNC_EXPORT_ROW_THRESHOLD,
          pollUrl: `/api/v1/seller/exports/jobs/${String(exportJob._id)}`,
          downloadUrl: `/api/v1/seller/exports/jobs/${String(exportJob._id)}/download`,
        },
        'Large export queued. Poll job status to download when completed.',
        202
      );
      return;
    }

    const { csv, filename, rowCount } = await SellerExportService.generateCSV(module, filters, {
      companyId: auth.companyId,
      canViewPii,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Module', module);
    res.setHeader('X-Export-Row-Count', String(rowCount));
    res.setHeader('X-Export-Pii-Masked', String(!canViewPii));
    res.setHeader('X-Export-Mode', 'sync');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const getSellerExportJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new ValidationError('Invalid export job ID');
    }

    await SellerExportJobProcessor.markExpiredIfNeeded(jobId);
    const job = await SellerExportJob.findOne({
      _id: new mongoose.Types.ObjectId(jobId),
      companyId: new mongoose.Types.ObjectId(auth.companyId),
    }).lean();

    if (!job) {
      throw new NotFoundError('Export job');
    }

    sendSuccess(res, {
      mode: 'async',
      jobId: String(job._id),
      status: job.status,
      progress: Number(job.progress || 0),
      module: job.module,
      estimatedRowCount: Number(job.estimatedRowCount || 0),
      rowCount: Number(job.rowCount || 0),
      filename: job.filename || null,
      fileSize: Number(job.fileSize || 0),
      errorMessage: job.errorMessage || null,
      createdAt: job.createdAt,
      startedAt: job.startedAt || null,
      completedAt: job.completedAt || null,
      expiresAt: job.expiresAt || null,
      downloadReady: job.status === 'completed' && Boolean(job.filePath),
      downloadUrl: `/api/v1/seller/exports/jobs/${String(job._id)}/download`,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadSellerExportJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new ValidationError('Invalid export job ID');
    }

    await SellerExportJobProcessor.markExpiredIfNeeded(jobId);
    const job = await SellerExportJob.findOne({
      _id: new mongoose.Types.ObjectId(jobId),
      companyId: new mongoose.Types.ObjectId(auth.companyId),
    }).lean();

    if (!job) {
      throw new NotFoundError('Export job');
    }

    if (job.status === 'failed') {
      throw new ConflictError(job.errorMessage || 'Export job failed');
    }

    if (job.status === 'expired') {
      throw new ConflictError('Export file expired. Please generate a new export.');
    }

    if (job.status !== 'completed' || !job.filePath) {
      throw new ConflictError('Export not ready for download yet.');
    }

    let statSize = 0;
    try {
      const fileStats = await fs.stat(job.filePath);
      statSize = fileStats.size;
    } catch {
      throw new NotFoundError('Export file');
    }

    const filename = job.filename || `${job.module}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Module', job.module);
    res.setHeader('X-Export-Row-Count', String(job.rowCount || 0));
    res.setHeader('X-Export-Pii-Masked', String(!job.canViewPii));
    res.setHeader('X-Export-Mode', 'async');
    res.setHeader('Content-Length', String(statSize));
    createReadStream(job.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

const sellerExportController = {
  exportSellerModule,
  getSellerExportJobStatus,
  downloadSellerExportJob,
};

export default sellerExportController;
