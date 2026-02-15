import { promises as fs } from 'fs';
import path from 'path';
import { Job } from 'bullmq';
import SellerExportService, { SellerExportModule } from '../../../core/application/services/export/seller-export.service';
import { SellerExportJob } from '../../database/mongoose/models';
import QueueManager from '../../utilities/queue-manager';
import logger from '../../../shared/logger/winston.logger';

export interface SellerExportJobData {
  exportJobId: string;
  companyId: string;
  module: SellerExportModule;
  filters: Record<string, unknown>;
  canViewPii: boolean;
}

export interface SellerExportJobResult {
  success: boolean;
  rowCount: number;
  filePath: string;
  fileSize: number;
  filename: string;
}

export class SellerExportJobProcessor {
  private static readonly QUEUE_NAME = 'seller-exports';
  private static readonly FILE_TTL_HOURS = 24;
  private static readonly EXPORT_DIRECTORY = '/tmp/shipcrowd-seller-exports';

  static async initialize(): Promise<void> {
    await QueueManager.registerWorker({
      queueName: this.QUEUE_NAME,
      processor: this.processJob.bind(this),
      concurrency: 2,
    });

    logger.info('Seller export worker initialized');
  }

  static async queueExport(data: SellerExportJobData): Promise<string> {
    const job = await QueueManager.addJob(
      this.QUEUE_NAME,
      `seller-export-${data.exportJobId}`,
      data,
      {
        jobId: data.exportJobId,
        removeOnComplete: 500,
        removeOnFail: false,
      }
    );

    return String(job.id ?? data.exportJobId);
  }

  private static async processJob(job: Job<SellerExportJobData>): Promise<SellerExportJobResult> {
    const { exportJobId, companyId, module, filters, canViewPii } = job.data;
    try {
      await SellerExportJob.findByIdAndUpdate(
        exportJobId,
        {
          status: 'processing',
          progress: 10,
          startedAt: new Date(),
          errorMessage: undefined,
        },
        { new: true }
      );
      await job.updateProgress(10);

      const result = await SellerExportService.generateCSV(module, filters, { companyId, canViewPii });
      await job.updateProgress(75);

      const companyFolder = path.join(this.EXPORT_DIRECTORY, companyId);
      await fs.mkdir(companyFolder, { recursive: true });
      const filePath = path.join(companyFolder, `${exportJobId}.csv`);
      await fs.writeFile(filePath, result.csv, 'utf8');
      const stats = await fs.stat(filePath);

      await SellerExportJob.findByIdAndUpdate(
        exportJobId,
        {
          status: 'completed',
          progress: 100,
          rowCount: result.rowCount,
          filename: result.filename,
          filePath,
          fileSize: stats.size,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + this.FILE_TTL_HOURS * 60 * 60 * 1000),
        },
        { new: true }
      );
      await job.updateProgress(100);

      return {
        success: true,
        rowCount: result.rowCount,
        filePath,
        fileSize: stats.size,
        filename: result.filename,
      };
    } catch (error: any) {
      logger.error('Seller export job failed', {
        jobId: job.id,
        exportJobId,
        companyId,
        module,
        error: error.message,
      });

      await SellerExportJob.findByIdAndUpdate(
        exportJobId,
        {
          status: 'failed',
          progress: 100,
          errorMessage: error.message,
          completedAt: new Date(),
        },
        { new: true }
      );

      throw error;
    }
  }

  static async markExpiredIfNeeded(exportJobId: string): Promise<void> {
    const job = await SellerExportJob.findById(exportJobId);
    if (!job) return;
    if (job.status !== 'completed' || !job.expiresAt) return;
    if (job.expiresAt.getTime() > Date.now()) return;

    if (job.filePath) {
      try {
        await fs.unlink(job.filePath);
      } catch {
        // best-effort cleanup
      }
    }

    await SellerExportJob.findByIdAndUpdate(job._id, {
      status: 'expired',
      filePath: undefined,
      fileSize: undefined,
    });
  }
}

export default SellerExportJobProcessor;
