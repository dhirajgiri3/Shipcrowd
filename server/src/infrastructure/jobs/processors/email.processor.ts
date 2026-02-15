import { Job, Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { renderEmailTemplate } from '../../../core/application/templates/emails/renderEmail';
import { EmailJob, EmailJobResult } from '../../../core/domain/types/email-job.types';
import logger from '../../../shared/logger/winston.logger';
import { AuditLog } from '../../database/mongoose/models/index';
import { RedisManager } from '../../redis/redis.manager';

/**
 * Email Queue Processor
 * 
 * Processes email jobs from the email queue with retry logic
 */

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Process a single email job
 */
export async function processEmailJob(job: Job<EmailJob>): Promise<EmailJobResult> {
  const { type, to, subject, template, data, userId, companyId } = job.data;

  logger.info(`Processing email job ${job.id} (${type}) to ${to}`);

  try {
    // Send email via SMTP
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@Shipcrowd.com',
      to,
      subject,
      html: await renderEmailTemplate(template, data),
    });

    // Log successful send to audit log
    await AuditLog.create({
      userId: userId || 'system',
      companyId: companyId || '',
      action: 'email_sent',
      category: 'communication',
      resourceType: 'email',
      resourceId: result.messageId,
      metadata: {
        type,
        to,
        subject,
        messageId: result.messageId,
        jobId: job.id,
        attemptNumber: job.attemptsMade,
      },
    });

    logger.info(`Email sent successfully: ${result.messageId}`, {
      jobId: job.id,
      type,
      to,
      messageId: result.messageId,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted as string[],
      rejected: result.rejected as string[],
      sentAt: new Date(),
    };
  } catch (error) {
    logger.error(`Email sending failed for job ${job.id}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      type,
      to,
      attemptNumber: job.attemptsMade,
    });

    // Log failure to audit log
    await AuditLog.create({
      userId: userId || 'system',
      companyId: companyId || '',
      action: 'email_failed',
      category: 'communication',
      resourceType: 'email',
      metadata: {
        type,
        to,
        subject,
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: job.id,
        attemptNumber: job.attemptsMade,
      },
    });

    throw error; // BullMQ will retry based on job options
  }
}



/**
 * Register email worker with QueueManager
 */
export function registerEmailWorker(): Worker {
  const connection = RedisManager.getBullMQConnection();

  const worker = new Worker<EmailJob, EmailJobResult>('email-queue', processEmailJob, {
    connection,
    concurrency: 5, // Process 5 emails concurrently
    limiter: {
      max: 10, // Max 10 emails per duration
      duration: 1000, // Per second
    },
  });

  worker.on('completed', (job) => {
    logger.info(`Email job ${job.id} completed`, {
      type: job.data.type,
      to: job.data.to,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error(`Email job ${job?.id} failed after ${job?.attemptsMade} attempts:`, {
      error: error.message,
      type: job?.data.type,
      to: job?.data.to,
    });
  });

  worker.on('error', (error) => {
    logger.error('Email worker error:', { error: error.message });
  });

  logger.info('✅ Email worker registered');

  return worker;
}
