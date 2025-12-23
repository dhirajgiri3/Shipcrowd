import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/mail';
import logger from '../../../../shared/logger/winston.logger';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  logger.info('SendGrid initialized successfully');
} else {
  logger.warn('SendGrid API key not found, falling back to SMTP');
}

// Email service configuration
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@Shipcrowd.com';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'sendgrid'; // 'sendgrid' or 'smtp'
const MAX_RETRY_ATTEMPTS = parseInt(process.env.EMAIL_MAX_RETRY || '3');
const RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000');

// SMTP configuration (used as fallback if SendGrid is not configured)
const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

/**
 * Helper function to retry a function with exponential backoff
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs: number
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Email attempt ${attempt + 1} failed, retrying in ${delayMs * Math.pow(2, attempt)}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
    }
  }

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

    if (EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
      // Use SendGrid
      const msg: MailDataRequired = {
        to: recipients,
        from: {
          email: EMAIL_FROM,
          name: process.env.EMAIL_FROM_NAME || 'Shipcrowd',
        },
        subject,
        html,
        text: plainText,
      };

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        msg.attachments = attachments.map(attachment => ({
          content: attachment.content,
          filename: attachment.filename,
          type: attachment.mimetype,
          disposition: 'attachment',
        }));
      }

      // Add template if provided
      if (templateId) {
        msg.templateId = templateId;
        if (dynamicTemplateData) {
          msg.dynamicTemplateData = dynamicTemplateData;
        }
      }

      // Send email with retry mechanism
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
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error sending email:', {
        error: error.message,
        stack: error.stack,
        recipients: Array.isArray(to) ? to.join(', ') : to,
        subject,
      });
    } else {
      logger.error('Unknown error sending email:', error);
    }
    return false;
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
      `You've been invited to manage ${companyName} on ShipCrowd`,
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
      <p>You have been selected to be the owner of <strong>${companyName}</strong> on ShipCrowd!</p>
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
      <p>Thank you,<br>The ShipCrowd Team</p>
    `;

    return sendEmail(to, `You've been invited to manage ${companyName} on ShipCrowd`, html);
  }
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
  sendOwnerInvitationEmail,
};
