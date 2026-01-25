import { Job, Worker } from 'bullmq';
import { EmailJob, EmailJobResult, EmailJobType } from '../../../core/domain/types/email-job.types.js';
import logger from '../../../shared/logger/winston.logger.js';
import { AuditLog } from '../../database/mongoose/models/index.js';
import QueueManager from '../../utilities/queue-manager.js';
import RedisConnection from '../../utilities/redis.connection.js';
import nodemailer from 'nodemailer';

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
      html: renderEmailTemplate(template, data),
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
 * Render email template with data
 * 
 * TODO: Replace with proper template engine (Handlebars, EJS, etc.)
 */
function renderEmailTemplate(template: string, data: Record<string, any>): string {
  // Simple template rendering - replace {{variable}} with data values
  let html = getEmailTemplate(template);

  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key]);
  });

  return html;
}

/**
 * Get email template HTML
 */
function getEmailTemplate(template: string): string {
  const templates: Record<string, string> = {
    verification: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to Shipcrowd, {{name}}!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <p>
              <a href="{{verificationUrl}}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
                Verify Email
              </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p>{{verificationUrl}}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    password_reset: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>Hi {{name}},</p>
            <p>We received a request to reset your password. Click the link below to reset it:</p>
            <p>
              <a href="{{resetUrl}}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
                Reset Password
              </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p>{{resetUrl}}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    new_device_alert: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Device Sign-in Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>New Device Sign-in Detected</h2>
            <p>Hi {{name}},</p>
            <p>We detected a sign-in to your account from a new device:</p>
            <ul>
              <li><strong>Device:</strong> {{deviceType}}</li>
              <li><strong>Browser:</strong> {{browser}}</li>
              <li><strong>Location:</strong> {{location}}</li>
              <li><strong>IP Address:</strong> {{ip}}</li>
              <li><strong>Time:</strong> {{timestamp}}</li>
            </ul>
            <p>If this was you, you can safely ignore this email.</p>
            <p>If this wasn't you, please secure your account immediately by changing your password.</p>
          </div>
        </body>
      </html>
    `,
    magic_link: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Magic Sign-in Link</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Sign in to Shipcrowd</h2>
            <p>Hi {{name}},</p>
            <p>Click the link below to sign in to your account:</p>
            <p>
              <a href="{{magicLinkUrl}}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
                Sign In
              </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p>{{magicLinkUrl}}</p>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this link, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
  };

  return templates[template] || `<p>{{message}}</p>`;
}

/**
 * Register email worker with QueueManager
 */
export function registerEmailWorker(): Worker {
  const connection = RedisConnection.getConnectionOptions();

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
