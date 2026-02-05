import jwt from 'jsonwebtoken';
import { NDREvent } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

export class NDRMagicLinkService {
    /**
     * Generate magic link with JWT token
     * Token valid for 7 days
     */
    static generateMagicLink(ndrEventId: string): string {
        try {
            if (!process.env.JWT_SECRET) {
                throw new Error('JWT_SECRET not configured');
            }

            const token = jwt.sign(
                {
                    ndrEventId,
                    type: 'ndr_resolution',
                    iat: Math.floor(Date.now() / 1000)
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const baseUrl = process.env.FRONTEND_URL || 'https://app.shipcrowd.com';
            return `${baseUrl}/resolve-ndr/${token}`;
        } catch (error) {
            logger.error('Failed to generate magic link', { ndrEventId, error });
            throw error;
        }
    }

    /**
     * Validate and decode magic link token
     */
    static async validateToken(token: string): Promise<{
        valid: boolean;
        ndrEventId?: string;
        error?: string;
    }> {
        try {
            if (!process.env.JWT_SECRET) {
                return { valid: false, error: 'Server configuration error' };
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

            if (decoded.type !== 'ndr_resolution') {
                return { valid: false, error: 'Invalid token type' };
            }

            // Check if NDR exists and is still actionable
            const ndrEvent = await NDREvent.findById(decoded.ndrEventId);
            if (!ndrEvent) {
                return { valid: false, error: 'NDR record not found' };
            }

            if (['resolved', 'rto_triggered', 'rto_delivered', 'delivered'].includes(ndrEvent.status)) {
                return { valid: false, error: 'NDR already resolved' };
            }

            return { valid: true, ndrEventId: decoded.ndrEventId };

        } catch (error: any) {
            if (error.name === 'TokenExpiredError') {
                return { valid: false, error: 'Link expired. Please request a new one.' };
            }
            return { valid: false, error: 'Invalid or malformed token' };
        }
    }
}

export default NDRMagicLinkService;
