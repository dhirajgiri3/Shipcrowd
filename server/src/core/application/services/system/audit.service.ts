import { AuditLog } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

export type AuditAction =
    | 'login' | 'logout' | 'security' | 'session_revoke'
    | 'kyc_update' | 'data_access' | 'profile_update'
    | 'create' | 'update' | 'delete' | 'compliance_check';

/**
 * Service to handle compliance logging and audit trails
 * Ensures GDPR/Compliance requirements are met
 */
export class AuditService {

    /**
     * Log a security or compliance event
     */
    async logEvent(
        userId: string,
        action: AuditAction,
        resource: string,
        resourceId: string,
        details: any,
        req?: any
    ) {
        try {
            // Extract IP and UA from request if available
            const ipAddress = req?.ip || details.ip || 'unknown';
            const userAgent = req?.headers?.['user-agent'] || details.userAgent || 'unknown';

            // Sanitize details (remove passwords, tokens)
            const sanitizedDetails = this.sanitize(details);

            await AuditLog.create({
                userId,
                action,
                resource,
                resourceId,
                details: sanitizedDetails,
                ipAddress,
                userAgent,
                timestamp: new Date()
            });

        } catch (error) {
            // Fallback logger - Audit logs should arguably not crash the app, 
            // but critical failures might need alerting
            logger.error('Failed to write AuditLog:', error);
        }
    }

    /**
     * Sanitize sensitive data from logs
     */
    private sanitize(data: any): any {
        if (!data) return {};
        const sanitized = { ...data };
        const sensitiveKeys = ['password', 'token', 'refreshToken', 'panNumber', 'aadhaarNumber'];

        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.includes(key)) sanitized[key] = '***REDACTED***';
        }
        return sanitized;
    }
}

export default new AuditService();
