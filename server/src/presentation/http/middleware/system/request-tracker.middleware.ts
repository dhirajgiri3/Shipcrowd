import { Request, Response, NextFunction } from 'express';
import SystemHealthService from '../../../../core/application/services/system/system-health.service';

/**
 * Request Tracker Middleware
 * Tracks API requests for health monitoring and metrics
 */

/**
 * Track request metrics (response time, errors)
 */
export const trackRequestMetrics = (req: Request, res: Response, next: NextFunction): void => {
    // Track active connection
    SystemHealthService.incrementActiveConnections();

    const startTime = Date.now();

    // Listen for response finish
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const isError = res.statusCode >= 400;

        // Track metrics
        SystemHealthService.trackRequest(responseTime, isError);

        // Decrement active connections
        SystemHealthService.decrementActiveConnections();
    });

    // Handle response close (connection terminated)
    res.on('close', () => {
        if (!res.writableEnded) {
            // Response was not properly finished
            SystemHealthService.decrementActiveConnections();
        }
    });

    next();
};

export default {
    trackRequestMetrics,
};
