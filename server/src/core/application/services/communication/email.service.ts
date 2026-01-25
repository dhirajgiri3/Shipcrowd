/**
 * Email
 * 
 * Purpose: Helper function to retry a function with exponential backoff
 * 
 * DEPENDENCIES:
 * - Error Handling, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/mail';
import axios from 'axios';
import logger from '../../../../shared/logger/winston.logger';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Email service configuration
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@Shipcrowd.com';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'sendgrid'; // 'sendgrid', 'smtp', or 'zeptomail'
const MAX_RETRY_ATTEMPTS = parseInt(process.env.EMAIL_MAX_RETRY || '3');
const RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000');
const MAX_RETRY_DELAY_MS = 30000; // Cap at 30 seconds to prevent infinite waits
const EMAIL_TIMEOUT_MS = parseInt(process.env.EMAIL_TIMEOUT_MS || '15000'); // 15 second timeout

// Circuit Breaker Configuration
let circuitBreakerFailures = 0;
let circuitBreakerLastFailure: Date | null = null;
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open circuit after 5 consecutive failures
const CIRCUIT_BREAKER_RESET_MS = 60000; // Reset after 1 minute

// ZeptoMail Configuration
const ZEPTOMAIL_API_URL = 'https://api.zeptomail.in/v1.1/email';
const ZEPTOMAIL_API_KEY = process.env.ZEPTOMAIL_API_KEY || process.env.SMTP_PASS; // Can reuse SMTP password

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY && EMAIL_SERVICE === 'sendgrid') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  logger.info('SendGrid initialized successfully');
} else if (EMAIL_SERVICE === 'zeptomail') {
  if (!ZEPTOMAIL_API_KEY) {
    logger.warn('ZeptoMail API key not found (check ZEPTOMAIL_API_KEY or SMTP_PASS)');
  } else {
    logger.info('ZeptoMail API service initialized');
  }
} else if (EMAIL_SERVICE === 'smtp') {
  logger.info('Using SMTP email service');
} else {
  logger.warn('No email service configured properly');
}

// SMTP configuration for ZeptoMail or other SMTP providers
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: smtpPort,
  secure: smtpPort === 465, // Use SSL for port 465, TLS for 587
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    // Do not fail on invalid certs (useful for development)
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
});

// Log SMTP configuration (without sensitive data)
if (EMAIL_SERVICE === 'smtp') {
  logger.info('SMTP Transport configured', {
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    user: process.env.SMTP_USER,
  });
}

/**
 * Check if error is retryable (temporary) or permanent
 */
const isRetryableError = (error: any): boolean => {
  // Permanent errors that should NOT be retried
  const permanentCodes = [
    'EAUTH', // Authentication failed
    'TM_3601', // Trial limit exceeded (ZeptoMail)
    'SM_133', // Trial limit (ZeptoMail)
    'SMI_115', // Daily limit (ZeptoMail)
  ];

  const errorCode = error.code || error.response?.data?.error?.code;
  if (permanentCodes.includes(errorCode)) {
    return false;
  }

  // SMTP "Sender Org Blocked" is permanent
  if (error.response?.includes('Sender Org Blocked')) {
    return false;
  }

  // Network errors are retryable
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Default: retry for unknown errors
  return true;
};

/**
 * Check circuit breaker status
 */
const checkCircuitBreaker = (): void => {
  if (circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    const timeSinceLastFailure = circuitBreakerLastFailure
      ? Date.now() - circuitBreakerLastFailure.getTime()
      : Infinity;

    if (timeSinceLastFailure < CIRCUIT_BREAKER_RESET_MS) {
      throw new Error(
        `Email service circuit breaker is OPEN. Too many failures (${circuitBreakerFailures}). ` +
        `Retry after ${Math.ceil((CIRCUIT_BREAKER_RESET_MS - timeSinceLastFailure) / 1000)}s`
      );
    } else {
      // Reset circuit breaker
      logger.info('Circuit breaker reset - attempting email service recovery');
      circuitBreakerFailures = 0;
      circuitBreakerLastFailure = null;
    }
  }
};

/**
 * Helper function to retry a function with exponential backoff and timeout protection
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs: number
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check circuit breaker before attempting
      checkCircuitBreaker();

      // Add timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Email operation timeout')), EMAIL_TIMEOUT_MS);
      });

      const result = await Promise.race([fn(), timeoutPromise]);

      // Success - reset circuit breaker
      if (circuitBreakerFailures > 0) {
        logger.info('Email service recovered - resetting circuit breaker');
        circuitBreakerFailures = 0;
        circuitBreakerLastFailure = null;
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        logger.error('Non-retryable email error detected:', {
          error: (error as Error).message,
          code: (error as any).code
        });
        throw error; // Don't retry permanent errors
      }

      // Update circuit breaker
      circuitBreakerFailures++;
      circuitBreakerLastFailure = new Date();

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate delay with exponential backoff, capped at MAX_RETRY_DELAY_MS
      const delay = Math.min(delayMs * Math.pow(2, attempt), MAX_RETRY_DELAY_MS);
      logger.warn(`Email attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`, {
        error: (error as Error).message,
        circuitBreakerFailures
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  logger.error('All email retry attempts exhausted', {
    attempts: maxRetries,
    circuitBreakerFailures
  });
  throw lastError;
};

/**
 * Send an email using the configured email service
 */
export const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string,
  text?: string,
  attachments?: any[],
  templateId?: string,
  dynamicTemplateData?: Record<string, any>
): Promise<boolean> => {
  try {
    // Convert single recipient to array for consistent handling
    const recipients = Array.isArray(to) ? to : [to];

    // Generate plain text from HTML if not provided
    const plainText = text || html.replace(/<[^>]*>/g, '');

    if (EMAIL_SERVICE === 'zeptomail' && ZEPTOMAIL_API_KEY) {
      // Use ZeptoMail API
      const zeptoRecipients = recipients.map(email => ({
        email_address: {
          address: email,
          // Extract name from email if possible/needed, or optional
        }
      }));

      const payload = {
        from: {
          address: EMAIL_FROM,
          name: process.env.EMAIL_FROM_NAME || 'Shipcrowd'
        },
        to: zeptoRecipients,
        subject,
        htmlbody: html,
        // textbody: plainText, // ZeptoMail uses htmlbody mostly
      };

      await retryWithBackoff(
        async () => {
          const response = await axios.post(ZEPTOMAIL_API_URL, payload, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Zoho-enczapikey ${ZEPTOMAIL_API_KEY}`
            }
          });
          return response.data;
        },
        MAX_RETRY_ATTEMPTS,
        RETRY_DELAY_MS
      );

      logger.info(`ZeptoMail API email sent to ${recipients.join(', ')}`);

    } else if (EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
      const msg: MailDataRequired = {
        to: recipients,
        from: {
          email: EMAIL_FROM,
          name: process.env.EMAIL_FROM_NAME || 'Shipcrowd',
        },
        subject,
        html,
        text: plainText,
        attachments: attachments ? attachments.map(a => ({
          content: a.content,
          filename: a.filename,
          type: a.mimetype,
          disposition: 'attachment',
        })) : undefined,
        templateId,
        dynamicTemplateData
      };

      await retryWithBackoff(
        () => sgMail.send(msg),
        MAX_RETRY_ATTEMPTS,
        RETRY_DELAY_MS
      );

      logger.info(`SendGrid email sent to ${recipients.join(', ')}`);
    } else {
      // Use SMTP as fallback
      for (const recipient of recipients) {
        const mailOptions = {
          from: EMAIL_FROM,
          to: recipient,
          subject,
          html,
          text: plainText,
          attachments,
        };

        await retryWithBackoff(
          () => smtpTransport.sendMail(mailOptions),
          MAX_RETRY_ATTEMPTS,
          RETRY_DELAY_MS
        );
      }

      logger.info(`SMTP email sent to ${recipients.join(', ')}`);
    }

    return true;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      // Handle Axios/ZeptoMail specific errors
      const apiError = error.response?.data;
      logger.error('ZeptoMail API Error:', {
        status: error.response?.status,
        code: apiError?.error?.code,
        message: apiError?.message || apiError?.error?.message,
        details: apiError?.error?.details,
        recipients: to
      });

      // Enhance error object for the controller to catch
      error.message = `ZeptoMail Error: ${apiError?.message || apiError?.error?.message || error.message}`;
      (error as any).code = apiError?.error?.code;
      (error as any).response = apiError;
    } else if (error instanceof Error) {
      logger.error('Error sending email:', {
        error: error.message,
        stack: error.stack,
        recipients: Array.isArray(to) ? to.join(', ') : to,
        subject,
        // @ts-ignore
        code: (error as any).code,
        // @ts-ignore
        response: (error as any).response,
      });
    } else {
      logger.error('Unknown error sending email:', error);
    }
    // Re-throw the error so callers can handle it
    throw error;
  }
};

/**
 * Send a verification email
 */
export const sendVerificationEmail = async (
  to: string,
  name: string,
  token: string
): Promise<boolean> => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  // Check if we have a template ID for verification emails
  const templateId = process.env.SENDGRID_VERIFICATION_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      'Verify Your Email Address',
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        name,
        verification_url: verificationUrl,
      }
    );
  } else {
    // Fallback to custom HTML
    const html = `
      <h1>Email Verification</h1>
      <p>Hello ${name},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify Email</a></p>
      <p>If you did not create an account, please ignore this email.</p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, 'Verify Your Email Address', html);
  }
};

/**
 * Send a password reset email
 */
export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  token: string
): Promise<boolean> => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  // Check if we have a template ID for password reset emails
  const templateId = process.env.SENDGRID_PASSWORD_RESET_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      'Reset Your Password',
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        name,
        reset_url: resetUrl,
      }
    );
  } else {
    // Fallback to custom HTML
    const html = `
      <h1>Password Reset</h1>
      <p>Hello ${name},</p>
      <p>You requested a password reset. Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, 'Reset Your Password', html);
  }
};

/**
 * Send a welcome email
 */
export const sendWelcomeEmail = async (
  to: string,
  name: string
): Promise<boolean> => {
  // Check if we have a template ID for welcome emails
  const templateId = process.env.SENDGRID_WELCOME_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      'Welcome to Shipcrowd',
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        name,
      }
    );
  } else {
    // Fallback to custom HTML
    const html = `
      <h1>Welcome to Shipcrowd!</h1>
      <p>Hello ${name},</p>
      <p>Thank you for joining Shipcrowd. We're excited to have you on board!</p>
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, 'Welcome to Shipcrowd', html);
  }
};

/**
 * Send a shipment status email
 */
export const sendShipmentStatusEmail = async (
  to: string,
  customerName: string,
  status: string,
  orderId: string,
  awbId: string,
  productName?: string,
  courierName?: string
): Promise<boolean> => {
  // Check if we have a template ID for shipment status emails
  const templateId = process.env.SENDGRID_SHIPMENT_STATUS_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      `Order #${orderId} ${status}`,
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        customer_name: customerName,
        order_id: orderId,
        status,
        awb_id: awbId,
        product_name: productName || '',
        courier_name: courierName || '',
        has_product_name: !!productName,
        has_courier_name: !!courierName,
      }
    );
  } else {
    // Fallback to custom HTML
    const html = `
      <h1>Shipment Status Update</h1>
      <p>Hello ${customerName},</p>
      <p>Your order #${orderId} ${productName ? `for ${productName}` : ''} has been <strong>${status}</strong>.</p>
      <p>Tracking Number: ${awbId}</p>
      ${courierName ? `<p>Courier: ${courierName}</p>` : ''}
      <p>You can track your shipment using the tracking number above.</p>
      <p>Thank you for choosing Shipcrowd!</p>
      <p>Best regards,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, `Order #${orderId} ${status}`, html);
  }
};

/**
 * Send a return status update email
 */
export const sendReturnStatusEmail = async (
  to: string,
  customerName: string,
  returnId: string,
  status: string,
  productNames: string[],
  actionRequired: boolean = false,
  details?: {
    refundAmount?: number;
    pickupDate?: Date;
    rejectionReason?: string;
    refundTransactionId?: string;
  }
): Promise<boolean> => {
  // Check if we have a template ID for return status emails
  const templateId = process.env.SENDGRID_RETURN_STATUS_TEMPLATE_ID;

  const statusMessageMap: Record<string, string> = {
    'requested': 'Your return request has been received',
    'approved': 'Your return request has been approved',
    'pickup_scheduled': 'Pickup has been scheduled for your return',
    'picked_up': 'Your return package has been picked up',
    'received_at_warehouse': 'Your return has reached our warehouse',
    'qc_pending': 'Your return is undergoing quality check',
    'qc_approved': 'Your return passed quality check',
    'qc_rejected': 'Your return failed quality check',
    'refund_processed': 'Your refund has been processed',
    'cancelled': 'Your return request has been cancelled'
  };

  const friendlyStatus = statusMessageMap[status] || `Return status updated to ${status}`;
  const productsList = productNames.join(', ');

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    return sendEmail(
      to,
      `Return Update: ${friendlyStatus}`,
      '',
      '',
      undefined,
      templateId,
      {
        customer_name: customerName,
        return_id: returnId,
        status_message: friendlyStatus,
        products: productsList,
        action_required: actionRequired,
        refund_amount: details?.refundAmount,
        pickup_date: details?.pickupDate ? new Date(details.pickupDate).toLocaleDateString() : undefined,
        rejection_reason: details?.rejectionReason,
        refund_transaction_id: details?.refundTransactionId
      }
    );
  } else {
    // Fallback HTML
    let detailsHtml = '';
    if (details?.pickupDate) detailsHtml += `<p><strong>Pickup Date:</strong> ${new Date(details.pickupDate).toLocaleDateString()}</p>`;
    if (details?.refundAmount) detailsHtml += `<p><strong>Refund Amount:</strong> ₹${details.refundAmount}</p>`;
    if (details?.rejectionReason) detailsHtml += `<p><strong>Reason:</strong> ${details.rejectionReason}</p>`;
    if (details?.refundTransactionId) detailsHtml += `<p><strong>Transaction ID:</strong> ${details.refundTransactionId}</p>`;

    const html = `
       <h1>Return Status Update</h1>
       <p>Hello ${customerName},</p>
       <p>${friendlyStatus} for Return ID: <strong>${returnId}</strong></p>
       <p><strong>Items:</strong> ${productsList}</p>
       ${detailsHtml}
       <p>You can track your return status in your dashboard.</p>
       <p>Thank you,<br>The Shipcrowd Team</p>
     `;

    return sendEmail(to, `Return Update: ${friendlyStatus}`, html);
  }
};

/**
 * Send a batch email to multiple recipients
 * This is more efficient than sending individual emails when using SendGrid
 */
export const sendBatchEmail = async (
  recipients: Array<{
    to: string;
    dynamicData?: Record<string, any>;
  }>,
  subject: string,
  templateId: string
): Promise<boolean> => {
  try {
    if (EMAIL_SERVICE !== 'sendgrid' || !process.env.SENDGRID_API_KEY) {
      logger.warn('Batch emails are only supported with SendGrid');
      return false;
    }

    // Create personalized messages for each recipient
    const personalizations = recipients.map(recipient => ({
      to: [{ email: recipient.to }],
      dynamicTemplateData: recipient.dynamicData || {},
    }));

    const msg = {
      from: {
        email: EMAIL_FROM,
        name: process.env.EMAIL_FROM_NAME || 'Shipcrowd',
      },
      subject,
      templateId,
      personalizations,
    };

    // Send batch email with retry mechanism
    await retryWithBackoff(
      () => sgMail.send(msg as any),
      MAX_RETRY_ATTEMPTS,
      RETRY_DELAY_MS
    );

    logger.info(`Batch email sent to ${recipients.length} recipients`);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error sending batch email:', {
        error: error.message,
        stack: error.stack,
        recipientCount: recipients.length,
        subject,
      });
    } else {
      logger.error('Unknown error sending batch email:', error);
    }
    return false;
  }
};

/**
 * Send a promotional or newsletter email to multiple recipients
 */
export const sendNewsletterEmail = async (
  recipients: string[],
  subject: string,
  content: string,
  templateId?: string
): Promise<boolean> => {
  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use batch sending with template
    return sendBatchEmail(
      recipients.map(email => ({
        to: email,
        dynamicData: {
          content,
        },
      })),
      subject,
      templateId
    );
  } else {
    // Fallback to individual emails
    try {
      return await sendEmail(recipients, subject, content);
    } catch (error) {
      logger.error('Error sending newsletter:', error);
      return false;
    }
  }
};

/**
 * Send a team invitation email
 */
export const sendTeamInvitationEmail = async (
  to: string,
  companyName: string,
  teamRole: string,
  token: string,
  invitationMessage?: string
): Promise<boolean> => {
  const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/join-team?token=${token}`;

  // Check if we have a template ID for team invitation emails
  const templateId = process.env.SENDGRID_TEAM_INVITATION_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      `Invitation to join ${companyName} on Shipcrowd`,
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        company_name: companyName,
        team_role: teamRole,
        invite_url: inviteUrl,
        invitation_message: invitationMessage || '',
      }
    );
  } else {
    // Fallback to custom HTML
    const html = `
      <h1>Team Invitation</h1>
      <p>Hello,</p>
      <p>You have been invited to join ${companyName} as a team member with the role of ${teamRole}.</p>
      ${invitationMessage ? `<p><strong>Message from the inviter:</strong> ${invitationMessage}</p>` : ''}
      <p>Please click the link below to accept the invitation:</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>This invitation will expire in 7 days.</p>
      <p>If you did not expect this invitation, please ignore this email.</p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, `Invitation to join ${companyName} on Shipcrowd`, html);
  }
};

/**
 * Send an email change verification email
 */
export const sendEmailChangeVerification = async (
  to: string,
  name: string,
  token: string
): Promise<boolean> => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email-change?token=${token}`;

  // Check if we have a template ID for email change verification
  const templateId = process.env.SENDGRID_EMAIL_CHANGE_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      'Verify Your New Email Address',
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        name,
        verification_url: verificationUrl,
      }
    );
  } else {
    // Fallback to custom HTML
    const html = `
      <h1>Email Change Verification</h1>
      <p>Hello ${name},</p>
      <p>Please verify your new email address by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify New Email</a></p>
      <p>If you did not request this change, please ignore this email or contact support immediately.</p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, 'Verify Your New Email Address', html);
  }
};

/**
 * Send a notification about email change to the old email address
 */
export const sendEmailChangeNotification = async (
  to: string,
  name: string,
  newEmail: string
): Promise<boolean> => {
  // Check if we have a template ID for email change notification
  const templateId = process.env.SENDGRID_EMAIL_CHANGE_NOTIFICATION_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      'Your Email Address Is Being Changed',
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        name,
        new_email: newEmail,
      }
    );
  } else {
    // Fallback to custom HTML
    const html = `
      <h1>Email Change Notification</h1>
      <p>Hello ${name},</p>
      <p>We're writing to inform you that a request has been made to change the email address associated with your Shipcrowd account.</p>
      <p>Your email is being changed to: <strong>${newEmail}</strong></p>
      <p>If you did not request this change, please contact our support team immediately.</p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, 'Your Email Address Is Being Changed', html);
  }
};

/**
 * Send a recovery email with backup options
 */
export const sendRecoveryEmail = async (
  to: string,
  name: string,
  recoveryOptions: {
    hasSecurityQuestions: boolean;
    hasBackupEmail: boolean;
    hasRecoveryKeys: boolean;
    backupEmail?: string;
  }
): Promise<boolean> => {
  // Check if we have a template ID for recovery email
  const templateId = process.env.SENDGRID_RECOVERY_EMAIL_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      'Account Recovery Options',
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        name,
        recovery_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/account-recovery`,
        has_security_questions: recoveryOptions.hasSecurityQuestions,
        has_backup_email: recoveryOptions.hasBackupEmail,
        has_recovery_keys: recoveryOptions.hasRecoveryKeys,
        backup_email: recoveryOptions.backupEmail || '',
      }
    );
  } else {
    // Fallback to custom HTML
    const recoveryMethods = [];
    if (recoveryOptions.hasSecurityQuestions) recoveryMethods.push('Security Questions');
    if (recoveryOptions.hasBackupEmail) recoveryMethods.push(`Backup Email (${recoveryOptions.backupEmail})`);
    if (recoveryOptions.hasRecoveryKeys) recoveryMethods.push('Recovery Keys');

    const recoveryMethodsList = recoveryMethods.map(method => `<li>${method}</li>`).join('');

    const html = `
      <h1>Account Recovery Options</h1>
      <p>Hello ${name},</p>
      <p>You have requested information about your account recovery options. You can recover your account using the following methods:</p>
      <ul>
        ${recoveryMethodsList}
      </ul>
      <p>To start the recovery process, please visit <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/account-recovery">our account recovery page</a>.</p>
      <p>If you did not request this information, please ignore this email or contact support immediately.</p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, 'Account Recovery Options', html);
  }
};

/**
 * Send a magic link for passwordless login
 */
export const sendMagicLinkEmail = async (
  to: string,
  name: string,
  magicUrl: string
): Promise<boolean> => {
  // Check if we have a template ID for magic link emails
  const templateId = process.env.SENDGRID_MAGIC_LINK_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      'Your Magic Link to Login',
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        name,
        magic_url: magicUrl,
      }
    );
  } else {
    // Fallback to custom HTML
    const html = `
      <h1>🔐 Your Magic Link</h1>
      <p>Hello ${name},</p>
      <p>You requested a magic link to sign in to your Shipcrowd account. Click the button below to log in instantly:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${magicUrl}" style="background-color: #2525FF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
          🚀 Sign In to Shipcrowd
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 13px; color: #333;">
        ${magicUrl}
      </p>
      <p style="color: #999; font-size: 13px; margin-top: 30px;">
        ⏱️ This link will expire in <strong>15 minutes</strong> for security reasons.
      </p>
      <p style="color: #999; font-size: 13px;">
        If you didn't request this magic link, you can safely ignore this email.
      </p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, '🔐 Your Magic Link to Login', html);
  }
};

/**
 * Send a company owner invitation email (admin only)
 */
export const sendOwnerInvitationEmail = async (
  to: string,
  name: string,
  companyName: string,
  token: string
): Promise<boolean> => {
  const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/accept-owner-invitation?token=${token}`;

  // Check if we have a template ID for owner invitation emails
  const templateId = process.env.SENDGRID_OWNER_INVITATION_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid template with dynamic data
    return sendEmail(
      to,
      `You've been invited to manage ${companyName} on Shipcrowd`,
      '', // HTML is not needed when using a template
      '', // Text is not needed when using a template
      undefined, // No attachments
      templateId,
      {
        name,
        company_name: companyName,
        invite_url: inviteUrl,
      }
    );
  } else {
    // Fallback to custom HTML
    const html = `
      <h1>Company Owner Invitation</h1>
      <p>Hello ${name},</p>
      <p>You have been selected to be the owner of <strong>${companyName}</strong> on Shipcrowd!</p>
      <p>As the company owner, you'll have full access to:</p>
      <ul>
        <li>Manage orders and shipments</li>
        <li>Track deliveries and analytics</li>
        <li>Set up warehouses and rate cards</li>
        <li>Invite and manage team members</li>
        <li>Configure company settings</li>
      </ul>
      <p>Please click the link below to accept this invitation and set up your account:</p>
      <p><a href="${inviteUrl}" style="background-color: #2525FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation & Create Account</a></p>
      <p>This invitation will expire in 7 days.</p>
      <p>If you did not expect this invitation, please contact our support team.</p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;

    return sendEmail(to, `You've been invited to manage ${companyName} on Shipcrowd`, html);
  }
};

/**
 * Send account recovery email for locked accounts
 */
export const sendAccountRecoveryEmail = async (
  to: string,
  name: string,
  recoveryUrl: string
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: #ffffff; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .btn { display: inline-block; padding: 14px 32 px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .btn:hover { background: #5568d3; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔓 Account Recovery</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>We received a request to recover your Shipcrowd account. If you were locked out or need to regain access, you can reset your account using the link below.</p>
            
            <div class="alert">
              <strong>⏰ This recovery link expires in 4 hours</strong>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${recoveryUrl}" class="btn">Recover My Account</a>
            </div>
            
            <p>After clicking the link above, you'll be able to:</p>
            <ul>
              <li>Unlock your account if it was locked</li>
              <li>Reset your password</li>
              <li>Regain full access to your Shipcrowd account</li>
            </ul>
  `;

  const text = `
Account Recovery - Shipcrowd

Hello ${name},

We received a request to recover your Shipcrowd account.

Recovery Link: ${recoveryUrl}

This link expires in 4 hours.

If you didn't request this, please ignore this email and ensure your account credentials are secure.

Thank you,
The Shipcrowd Security Team
  `;

  return sendEmail(to, '🔓 Account Recovery - Shipcrowd', html, text);
};


/**
 * Send a new device login notification
 */
export const sendNewDeviceLoginEmail = async (
  to: string,
  name: string,
  deviceInfo: {
    deviceType: string;
    os: string;
    browser: string;
    ip: string;
    location?: string;
    time: Date;
  }
): Promise<boolean> => {
  // Check if we have a template ID
  const templateId = process.env.SENDGRID_NEW_DEVICE_LOGIN_TEMPLATE_ID;

  if (templateId && EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    return sendEmail(
      to,
      'New Sign-in to Your Account',
      '',
      '',
      undefined,
      templateId,
      {
        name,
        device_type: deviceInfo.deviceType,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        ip: deviceInfo.ip,
        location: deviceInfo.location || 'Unknown Location',
        time: deviceInfo.time.toLocaleString(),
      }
    );
  } else {
    const html = `
      <h1>New Sign-in Detected</h1>
      <p>Hello ${name},</p>
      <p>We detected a new sign-in to your Shipcrowd account from a new device.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Device:</strong> ${deviceInfo.deviceType} (${deviceInfo.os})</p>
        <p><strong>Browser:</strong> ${deviceInfo.browser}</p>
        <p><strong>IP Address:</strong> ${deviceInfo.ip}</p>
        <p><strong>Time:</strong> ${deviceInfo.time.toLocaleString()}</p>
      </div>
      <p>If this was you, you can safely ignore this email.</p>
      <p><strong>If this wasn't you, please reset your password immediately.</strong></p>
      <p>Thank you,<br>The Shipcrowd Team</p>
    `;
    return sendEmail(to, 'New Sign-in to Your Account', html);
  }
};

/**
 * Send fraud alert email to admin team
 */
export const sendFraudAlertEmail = async (
  adminEmail: string,
  alertDetails: {
    alertId: string;
    riskLevel: string;
    fraudScore: number;
    orderValue: number;
    customerName: string;
    customerPhone: string;
    matchedRules: string[];
    blacklistMatches: string[];
    aiSummary?: string;
  }
): Promise<void> => {
  const subject = `🚨 Fraud Alert: ${alertDetails.riskLevel.toUpperCase()} Risk Order Detected`;

  const rulesHtml = alertDetails.matchedRules.length > 0
    ? `<ul>${alertDetails.matchedRules.map(rule => `<li>${rule}</li>`).join('')}</ul>`
    : '<p>No rules matched</p>';

  const blacklistHtml = alertDetails.blacklistMatches.length > 0
    ? `<ul>${alertDetails.blacklistMatches.map(match => `<li>${match}</li>`).join('')}</ul>`
    : '<p>No blacklist matches</p>';

  const riskColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  };
  const riskColor = riskColors[alertDetails.riskLevel] || '#6b7280';

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: white; border-left: 4px solid ${riskColor}; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .risk-badge { background: ${riskColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
          .score { font-size: 48px; font-weight: bold; color: ${riskColor}; text-align: center; margin: 20px 0; }
          .detail-row { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Fraud Alert</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <div style="text-align: center;"><span class="risk-badge">${alertDetails.riskLevel.toUpperCase()}</span></div>
              <div class="score">${alertDetails.fraudScore}/100</div>
              <div class="detail-row"><strong>Alert ID:</strong> ${alertDetails.alertId}</div>
              <div class="detail-row"><strong>Customer:</strong> ${alertDetails.customerName}</div>
              <div class="detail-row"><strong>Phone:</strong> ${alertDetails.customerPhone}</div>
              <div class="detail-row"><strong>Order Value:</strong> ₹${alertDetails.orderValue.toLocaleString()}</div>
            </div>
            <h3>⚠️ Matched Rules</h3>
            ${rulesHtml}
            <h3>🚫 Blacklist Matches</h3>
            ${blacklistHtml}
            ${alertDetails.aiSummary ? `<h3>🤖 AI Analysis</h3><p>${alertDetails.aiSummary}</p>` : ''}
            <p style="text-align: center; margin-top: 30px;">
              <a href="${process.env.ADMIN_DASHBOARD_URL || 'https://admin.Shipcrowd.com'}/fraud/alerts/${alertDetails.alertId}" 
                 style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Review Alert →
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

  await sendEmail(adminEmail, subject, html);
  logger.info('Fraud alert email sent', { alertId: alertDetails.alertId, adminEmail });
};

/**
 * Send dispute created notification
 */
export const sendDisputeCreatedEmail = async (
  customerEmail: string,
  disputeDetails: {
    disputeId: string;
    type: string;
    category: string;
    description: string;
    shipmentTrackingNumber?: string;
    priority: string;
    slaDeadline: Date;
  }
): Promise<void> => {
  const subject = `Dispute Created - ${disputeDetails.disputeId}`;

  const priorityColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    urgent: '#dc2626',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .dispute-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
        .priority-badge { display: inline-block; padding: 5px 12px; border-radius: 12px; color: white; font-size: 12px; font-weight: bold; background: ${priorityColors[disputeDetails.priority]}; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .btn { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Dispute Created</h1>
        </div>
        <div class="content">
          <p>Dear Customer,</p>
          <p>Your dispute has been successfully created and our team will investigate it shortly.</p>

          <div class="dispute-box">
            <div style="margin-bottom: 15px;">
              <strong>Dispute ID:</strong> ${disputeDetails.disputeId}
              <span class="priority-badge">${disputeDetails.priority.toUpperCase()}</span>
            </div>
            <div class="detail-row"><strong>Type:</strong> ${disputeDetails.type}</div>
            <div class="detail-row"><strong>Category:</strong> ${disputeDetails.category.replace(/_/g, ' ')}</div>
            ${disputeDetails.shipmentTrackingNumber ? `<div class="detail-row"><strong>Tracking Number:</strong> ${disputeDetails.shipmentTrackingNumber}</div>` : ''}
            <div class="detail-row"><strong>Description:</strong> ${disputeDetails.description}</div>
            <div class="detail-row"><strong>SLA Deadline:</strong> ${new Date(disputeDetails.slaDeadline).toLocaleString()}</div>
          </div>

          <p><strong>What happens next?</strong></p>
          <ul>
            <li>Our team will review your dispute within the SLA timeline</li>
            <li>You may be asked to provide additional evidence</li>
            <li>You'll receive updates via email</li>
            <li>Track progress in your dashboard</li>
          </ul>

          <p style="text-align: center;">
            <a href="${process.env.DASHBOARD_URL || 'https://app.Shipcrowd.com'}/disputes/${disputeDetails.disputeId}" class="btn">
              View Dispute →
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(customerEmail, subject, html);
  logger.info('Dispute created email sent', { disputeId: disputeDetails.disputeId, customerEmail });
};

/**
 * Send dispute escalated notification
 */
export const sendDisputeEscalatedEmail = async (
  adminEmail: string,
  disputeDetails: {
    disputeId: string;
    type: string;
    reason: string;
    customerName: string;
    priority: string;
  }
): Promise<void> => {
  const subject = `🚨 Dispute Escalated - ${disputeDetails.disputeId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #fee2e2; }
        .btn { background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 URGENT: Dispute Escalated</h1>
        </div>
        <div class="content">
          <p><strong>Action Required</strong></p>
          <p>A dispute has been escalated and requires immediate attention.</p>

          <div class="alert-box">
            <div class="detail-row"><strong>Dispute ID:</strong> ${disputeDetails.disputeId}</div>
            <div class="detail-row"><strong>Customer:</strong> ${disputeDetails.customerName}</div>
            <div class="detail-row"><strong>Type:</strong> ${disputeDetails.type}</div>
            <div class="detail-row"><strong>Priority:</strong> ${disputeDetails.priority.toUpperCase()}</div>
            <div class="detail-row"><strong>Escalation Reason:</strong> ${disputeDetails.reason}</div>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.ADMIN_DASHBOARD_URL || 'https://admin.Shipcrowd.com'}/disputes/${disputeDetails.disputeId}" class="btn">
              Handle Escalation →
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(adminEmail, subject, html);
  logger.info('Dispute escalated email sent', { disputeId: disputeDetails.disputeId, adminEmail });
};

/**
 * Send dispute resolved notification
 */
export const sendDisputeResolvedEmail = async (
  customerEmail: string,
  disputeDetails: {
    disputeId: string;
    resolutionType: string;
    reason: string;
    amount?: number;
  }
): Promise<void> => {
  const subject = `Dispute Resolved - ${disputeDetails.disputeId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
        .resolution-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #d1fae5; }
        .amount { font-size: 24px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Dispute Resolved</h1>
        </div>
        <div class="content">
          <p>Dear Customer,</p>
          <p>Your dispute has been reviewed and resolved.</p>

          <div class="resolution-box">
            <div class="detail-row"><strong>Dispute ID:</strong> ${disputeDetails.disputeId}</div>
            <div class="detail-row"><strong>Resolution:</strong> ${disputeDetails.resolutionType.replace(/_/g, ' ')}</div>
            ${disputeDetails.amount ? `<div class="amount">₹${disputeDetails.amount.toLocaleString()}</div>` : ''}
            <div class="detail-row"><strong>Details:</strong> ${disputeDetails.reason}</div>
          </div>

          ${disputeDetails.resolutionType === 'refund' ? '<p>The refund will be processed to your wallet within 1-2 business days.</p>' : ''}
          ${disputeDetails.resolutionType === 'replacement' ? '<p>Your replacement shipment will be initiated shortly.</p>' : ''}

          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(customerEmail, subject, html);
  logger.info('Dispute resolved email sent', { disputeId: disputeDetails.disputeId, customerEmail });
};

/**
 * Send SLA warning notification
 */
export const sendSLAWarningEmail = async (
  adminEmail: string,
  disputeDetails: {
    disputeId: string;
    hoursRemaining: number;
    deadline: Date;
  }
): Promise<void> => {
  const subject = `⚠️ SLA Warning - ${disputeDetails.disputeId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fffbeb; padding: 30px; border-radius: 0 0 8px 8px; }
        .warning-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; text-align: center; }
        .hours { font-size: 48px; font-weight: bold; color: #f59e0b; }
        .btn { background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ SLA Deadline Approaching</h1>
        </div>
        <div class="content">
          <p><strong>Attention Required</strong></p>

          <div class="warning-box">
            <p>Dispute ID: ${disputeDetails.disputeId}</p>
            <div class="hours">${disputeDetails.hoursRemaining}h</div>
            <p>remaining until SLA deadline</p>
            <p style="color: #78716c; font-size: 14px;">Deadline: ${new Date(disputeDetails.deadline).toLocaleString()}</p>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.ADMIN_DASHBOARD_URL || 'https://admin.Shipcrowd.com'}/disputes/${disputeDetails.disputeId}" class="btn">
              Resolve Now →
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(adminEmail, subject, html);
  logger.info('SLA warning email sent', { disputeId: disputeDetails.disputeId, adminEmail });
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendShipmentStatusEmail,
  sendBatchEmail,
  sendNewsletterEmail,
  sendTeamInvitationEmail,
  sendEmailChangeVerification,
  sendEmailChangeNotification,
  sendRecoveryEmail,
  sendMagicLinkEmail,
  sendOwnerInvitationEmail,
  sendAccountRecoveryEmail,
  sendNewDeviceLoginEmail,
  sendReturnStatusEmail,
  sendFraudAlertEmail,
  sendDisputeCreatedEmail,
  sendDisputeEscalatedEmail,
  sendDisputeResolvedEmail,
  sendSLAWarningEmail,
};
