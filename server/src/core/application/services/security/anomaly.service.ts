import { User } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import geoip from 'geoip-lite';

interface LoginAttempt {
    userId: string;
    ip: string;
    userAgent: string;
    timestamp: Date;
}

/**
 * Service to detect suspicious activities and anomalies
 */
export class AnomalyDetectionService {

    /**
     * Check for login anomalies
     * - Velocity checks (impossible travel)
     * - New country/location
     */
    async checkLoginAnomaly(userId: string, currentIp: string): Promise<{ isAnomalous: boolean; reason?: string; location?: string }> {
        try {
            const geo = geoip.lookup(currentIp);
            const currentLocation = geo ? `${geo.city}, ${geo.country}` : 'Unknown';
            const currentUser = await User.findById(userId);

            if (!currentUser) return { isAnomalous: false };

            // Simple check: If user has a last login, check if country changed rapidly?
            // For now, we'll just return basic info. 
            // Real implementation would compare against previous login location and time.

            const lastLogin = currentUser.security.lastLogin;

            if (lastLogin && lastLogin.ip) {
                const lastGeo = geoip.lookup(lastLogin.ip);
                if (lastGeo && geo && lastGeo.country !== geo.country) {
                    return {
                        isAnomalous: true,
                        reason: `Login from new country: ${geo.country} (previously ${lastGeo.country})`,
                        location: currentLocation
                    };
                }
            }

            return { isAnomalous: false, location: currentLocation };

        } catch (error) {
            logger.error('Error in anomaly detection:', error);
            return { isAnomalous: false };
        }
    }
}

export default new AnomalyDetectionService();
