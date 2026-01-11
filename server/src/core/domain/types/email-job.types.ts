/**
 * Email Job Types
 * 
 * Defines the types and interfaces for email queue jobs
 */

export enum EmailJobType {
    VERIFICATION = 'verification',
    PASSWORD_RESET = 'password_reset',
    MAGIC_LINK = 'magic_link',
    NEW_DEVICE_ALERT = 'new_device_alert',
    SECURITY_ALERT = 'security_alert',
    ORDER_CONFIRMATION = 'order_confirmation',
    SHIPMENT_UPDATE = 'shipment_update',
    KYC_APPROVED = 'kyc_approved',
    KYC_REJECTED = 'kyc_rejected',
    TEAM_INVITATION = 'team_invitation',
    WELCOME = 'welcome'
}

export interface EmailJob {
    type: EmailJobType;
    to: string;
    subject: string;
    template: string;
    data: Record<string, any>;
    priority?: number;
    userId?: string;
    companyId?: string;
}

export interface EmailJobResult {
    messageId: string;
    accepted: string[];
    rejected: string[];
    sentAt: Date;
}
