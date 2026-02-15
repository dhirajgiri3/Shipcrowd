/**
 * Email Queue Service
 * 
 * Wrapper service that queues email jobs instead of sending directly.
 * This provides retry logic, failure tracking, and better reliability.
 */

import QueueManager from '../../../../infrastructure/utilities/queue-manager';
import logger from '../../../../shared/logger/winston.logger';
import { EmailJob, EmailJobType } from '../../../domain/types/email-job.types';

/**
 * Queue a verification email
 */
export async function queueVerificationEmail(
    to: string,
    name: string,
    token: string,
    userId?: string,
    companyId?: string
): Promise<void> {
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('verification-email', {
        type: EmailJobType.VERIFICATION,
        to,
        subject: 'Verify Your Email - Shipcrowd',
        template: 'verification',
        data: {
            name,
            token,
            verificationUrl,
        },
        priority: 1, // High priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`Verification email queued for ${to}`);
}

/**
 * Queue a password reset email
 */
export async function queuePasswordResetEmail(
    to: string,
    name: string,
    token: string,
    userId?: string,
    companyId?: string
): Promise<void> {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('password-reset-email', {
        type: EmailJobType.PASSWORD_RESET,
        to,
        subject: 'Reset Your Password - Shipcrowd',
        template: 'password_reset',
        data: {
            name,
            token,
            resetUrl,
        },
        priority: 1, // High priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`Password reset email queued for ${to}`);
}

/**
 * Queue a magic link email
 */
export async function queueMagicLinkEmail(
    to: string,
    name: string,
    magicUrl: string,
    userId?: string,
    companyId?: string
): Promise<void> {
    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('magic-link-email', {
        type: EmailJobType.MAGIC_LINK,
        to,
        subject: 'Your Magic Link - Shipcrowd',
        template: 'magic_link',
        data: {
            name,
            magicLinkUrl: magicUrl,
        },
        priority: 1, // High priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`Magic link email queued for ${to}`);
}

/**
 * Queue a new device login alert email
 */
export async function queueNewDeviceLoginEmail(
    to: string,
    name: string,
    deviceInfo: {
        deviceType: string;
        browser: string;
        location: string;
        ip: string;
        timestamp: string;
    },
    userId?: string,
    companyId?: string
): Promise<void> {
    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('new-device-alert-email', {
        type: EmailJobType.NEW_DEVICE_ALERT,
        to,
        subject: 'New Device Sign-in Alert - Shipcrowd',
        template: 'new_device_alert',
        data: {
            name,
            ...deviceInfo,
        },
        priority: 2, // Medium priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`New device alert email queued for ${to}`);
}

/**
 * Queue a security alert email
 */
export async function queueSecurityAlertEmail(
    to: string,
    name: string,
    alertType: string,
    details: Record<string, any>,
    userId?: string,
    companyId?: string
): Promise<void> {
    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('security-alert-email', {
        type: EmailJobType.SECURITY_ALERT,
        to,
        subject: `Security Alert: ${alertType} - Shipcrowd`,
        template: 'security_alert',
        data: {
            name,
            alertType,
            ...details,
        },
        priority: 1, // High priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`Security alert email queued for ${to}`);
}

/**
 * Queue an order confirmation email
 */
export async function queueOrderConfirmationEmail(
    to: string,
    customerName: string,
    orderId: string,
    orderDetails: Record<string, any>,
    userId?: string,
    companyId?: string
): Promise<void> {
    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('order-confirmation-email', {
        type: EmailJobType.ORDER_CONFIRMATION,
        to,
        subject: `Order Confirmation #${orderId} - Shipcrowd`,
        template: 'order_confirmation',
        data: {
            customerName,
            orderId,
            ...orderDetails,
        },
        priority: 3, // Normal priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`Order confirmation email queued for ${to}`);
}

/**
 * Queue a shipment update email
 */
export async function queueShipmentUpdateEmail(
    to: string,
    customerName: string,
    shipmentId: string,
    status: string,
    trackingNumber: string,
    userId?: string,
    companyId?: string
): Promise<void> {
    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('shipment-update-email', {
        type: EmailJobType.SHIPMENT_UPDATE,
        to,
        subject: `Shipment Update: ${status} - Shipcrowd`,
        template: 'shipment_update',
        data: {
            customerName,
            shipmentId,
            status,
            trackingNumber,
        },
        priority: 3, // Normal priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`Shipment update email queued for ${to}`);
}

/**
 * Queue a welcome email
 */
export async function queueWelcomeEmail(
    to: string,
    name: string,
    userId?: string,
    companyId?: string
): Promise<void> {
    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('welcome-email', {
        type: EmailJobType.WELCOME,
        to,
        subject: 'Welcome to Shipcrowd!',
        template: 'welcome',
        data: {
            name,
        },
        priority: 3, // Normal priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`Welcome email queued for ${to}`);
}

/**
 * Queue a team invitation email
 */
export async function queueTeamInvitationEmail(
    to: string,
    companyName: string,
    teamRole: string,
    token: string,
    invitationMessage?: string,
    userId?: string,
    companyId?: string
): Promise<void> {
    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/join-team?token=${token}`;

    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('team-invitation-email', {
        type: EmailJobType.TEAM_INVITATION,
        to,
        subject: `Invitation to join ${companyName} - Shipcrowd`,
        template: 'team_invitation',
        data: {
            companyName,
            teamRole,
            inviteUrl,
            invitationMessage: invitationMessage || '',
        },
        priority: 2, // Medium priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`Team invitation email queued for ${to}`);
}

/**
 * Queue a KYC approved email
 */
export async function queueKYCApprovedEmail(
    to: string,
    name: string,
    userId?: string,
    companyId?: string,
    templateData?: { companyName?: string; verifiedDate?: string }
): Promise<void> {
    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('kyc-approved-email', {
        type: EmailJobType.KYC_APPROVED,
        to,
        subject: 'KYC Verification Approved - Shipcrowd',
        template: 'kyc_approved',
        data: {
            name,
            ...templateData,
        },
        priority: 2, // Medium priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`KYC approved email queued for ${to}`);
}

/**
 * Queue a KYC rejected email
 */
export async function queueKYCRejectedEmail(
    to: string,
    name: string,
    reason: string,
    userId?: string,
    companyId?: string,
    templateData?: { resubmitLink?: string; supportEmail?: string }
): Promise<void> {
    const emailQueue = QueueManager.getEmailQueue();

    await emailQueue.add('kyc-rejected-email', {
        type: EmailJobType.KYC_REJECTED,
        to,
        subject: 'KYC Verification Requires Attention - Shipcrowd',
        template: 'kyc_rejected',
        data: {
            name,
            reason,
            ...templateData,
        },
        priority: 2, // Medium priority
        userId,
        companyId,
    } as EmailJob);

    logger.info(`KYC rejected email queued for ${to}`);
}
