import mongoose from 'mongoose';
import os from 'os';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import axios from 'axios';

/**
 * System Health Service
 * Monitors application health, database, external services, and system resources
 */

export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    details?: any;
    timestamp: Date;
    responseTime?: number;
}

export interface SystemMetrics {
    uptime: number;
    memory: {
        total: number;
        free: number;
        used: number;
        usagePercent: number;
    };
    cpu: {
        cores: number;
        loadAverage: number[];
        usagePercent: number;
    };
    process: {
        pid: number;
        uptime: number;
        memoryUsage: {
            rss: number;
            heapTotal: number;
            heapUsed: number;
            external: number;
        };
        cpuUsage: {
            user: number;
            system: number;
        };
    };
}

export interface DatabaseHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    connected: boolean;
    responseTime?: number;
    connections?: {
        current: number;
        available: number;
    };
    replicationStatus?: string;
    lastError?: string;
}

export interface ExternalServiceHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    lastChecked: Date;
    endpoint?: string;
    error?: string;
}

export interface ComprehensiveHealthReport {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    systemMetrics: SystemMetrics;
    database: DatabaseHealth;
    externalServices: ExternalServiceHealth[];
    apiMetrics: {
        totalRequests: number;
        activeConnections: number;
        averageResponseTime: number;
        errorRate: number;
    };
}

class SystemHealthService {
    private requestCounter: number = 0;
    private totalResponseTime: number = 0;
    private errorCounter: number = 0;
    private activeConnections: number = 0;
    private startTime: Date = new Date();

    /**
     * Get comprehensive system health report
     */
    async getHealthReport(): Promise<ComprehensiveHealthReport> {
        const [systemMetrics, databaseHealth, externalServicesHealth] = await Promise.all([
            this.getSystemMetrics(),
            this.checkDatabaseHealth(),
            this.checkExternalServices(),
        ]);

        // Determine overall health
        let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        if (databaseHealth.status === 'unhealthy') {
            overall = 'unhealthy';
        } else if (
            databaseHealth.status === 'degraded' ||
            externalServicesHealth.some((s) => s.status === 'unhealthy') ||
            systemMetrics.memory.usagePercent > 90 ||
            systemMetrics.cpu.usagePercent > 90
        ) {
            overall = 'degraded';
        } else if (externalServicesHealth.some((s) => s.status === 'degraded')) {
            overall = 'degraded';
        }

        return {
            overall,
            timestamp: new Date(),
            systemMetrics,
            database: databaseHealth,
            externalServices: externalServicesHealth,
            apiMetrics: {
                totalRequests: this.requestCounter,
                activeConnections: this.activeConnections,
                averageResponseTime:
                    this.requestCounter > 0 ? this.totalResponseTime / this.requestCounter : 0,
                errorRate: this.requestCounter > 0 ? this.errorCounter / this.requestCounter : 0,
            },
        };
    }

    /**
     * Basic health check endpoint (lightweight)
     */
    async basicHealthCheck(): Promise<HealthCheckResult> {
        const startTime = Date.now();

        try {
            // Check database connectivity
            const dbState = mongoose.connection.readyState;

            if (dbState !== 1) {
                return {
                    status: 'unhealthy',
                    message: 'Database not connected',
                    details: { dbState, dbStates: { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' } },
                    timestamp: new Date(),
                    responseTime: Date.now() - startTime,
                };
            }

            // Quick database ping
            await mongoose.connection.db?.admin().ping();

            return {
                status: 'healthy',
                message: 'All systems operational',
                details: { database: 'connected', uptime: process.uptime() },
                timestamp: new Date(),
                responseTime: Date.now() - startTime,
            };
        } catch (error) {
            logger.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                message: 'Health check failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
                timestamp: new Date(),
                responseTime: Date.now() - startTime,
            };
        }
    }

    /**
     * Get system metrics (CPU, memory, etc.)
     */
    private async getSystemMetrics(): Promise<SystemMetrics> {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;

        const processMemory = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        // Calculate CPU usage percentage (approximation)
        const cpuPercent = os.loadavg()[0] / os.cpus().length * 100;

        return {
            uptime: os.uptime(),
            memory: {
                total: totalMemory,
                free: freeMemory,
                used: usedMemory,
                usagePercent: (usedMemory / totalMemory) * 100,
            },
            cpu: {
                cores: os.cpus().length,
                loadAverage: os.loadavg(),
                usagePercent: Math.min(cpuPercent, 100),
            },
            process: {
                pid: process.pid,
                uptime: process.uptime(),
                memoryUsage: {
                    rss: processMemory.rss,
                    heapTotal: processMemory.heapTotal,
                    heapUsed: processMemory.heapUsed,
                    external: processMemory.external,
                },
                cpuUsage: {
                    user: cpuUsage.user,
                    system: cpuUsage.system,
                },
            },
        };
    }

    /**
     * Check database health
     */
    private async checkDatabaseHealth(): Promise<DatabaseHealth> {
        const startTime = Date.now();

        try {
            const dbState = mongoose.connection.readyState;

            if (dbState !== 1) {
                return {
                    status: 'unhealthy',
                    connected: false,
                    lastError: 'Database not connected',
                };
            }

            // Ping database
            await mongoose.connection.db?.admin().ping();
            const responseTime = Date.now() - startTime;

            // Get connection stats
            const serverStatus = await mongoose.connection.db?.admin().serverStatus();

            return {
                status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
                connected: true,
                responseTime,
                connections: {
                    current: serverStatus?.connections?.current || 0,
                    available: serverStatus?.connections?.available || 0,
                },
                replicationStatus: serverStatus?.repl?.ismaster ? 'primary' : 'secondary',
            };
        } catch (error) {
            logger.error('Database health check failed:', error);
            return {
                status: 'unhealthy',
                connected: false,
                lastError: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check external services health
     */
    private async checkExternalServices(): Promise<ExternalServiceHealth[]> {
        const services: ExternalServiceHealth[] = [];

        // Check Velocity API
        const velocityHealth = await this.checkVelocityHealth();
        services.push(velocityHealth);

        // Check Razorpay API (if configured)
        if (process.env.RAZORPAY_KEY_ID) {
            const razorpayHealth = await this.checkRazorpayHealth();
            services.push(razorpayHealth);
        }

        // Check Redis (if configured)
        if (process.env.REDIS_URL) {
            const redisHealth = await this.checkRedisHealth();
            services.push(redisHealth);
        }

        return services;
    }

    /**
     * Check Velocity API health
     */
    private async checkVelocityHealth(): Promise<ExternalServiceHealth> {
        const startTime = Date.now();

        try {
            // Velocity base URL
            const baseUrl = process.env.VELOCITY_BASE_URL || 'https://api.velocityexpress.in';

            // Simple ping endpoint (adjust based on actual Velocity API)
            const response = await axios.get(`${baseUrl}/health`, {
                timeout: 5000,
                validateStatus: () => true, // Don't throw on any status
            });

            const responseTime = Date.now() - startTime;

            return {
                name: 'Velocity API',
                status: response.status === 200 ? 'healthy' : 'degraded',
                responseTime,
                lastChecked: new Date(),
                endpoint: baseUrl,
            };
        } catch (error) {
            logger.warn('Velocity health check failed:', error);
            return {
                name: 'Velocity API',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastChecked: new Date(),
                error: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    }

    /**
     * Check Razorpay API health
     */
    private async checkRazorpayHealth(): Promise<ExternalServiceHealth> {
        const startTime = Date.now();

        try {
            // Simple API call to verify connectivity
            const response = await axios.get('https://api.razorpay.com', {
                timeout: 5000,
                auth: {
                    username: process.env.RAZORPAY_KEY_ID || '',
                    password: process.env.RAZORPAY_KEY_SECRET || '',
                },
                validateStatus: () => true,
            });

            const responseTime = Date.now() - startTime;

            return {
                name: 'Razorpay API',
                status: response.status < 500 ? 'healthy' : 'degraded',
                responseTime,
                lastChecked: new Date(),
                endpoint: 'https://api.razorpay.com',
            };
        } catch (error) {
            logger.warn('Razorpay health check failed:', error);
            return {
                name: 'Razorpay API',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastChecked: new Date(),
                error: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    }

    /**
     * Check Redis health (if configured)
     */
    private async checkRedisHealth(): Promise<ExternalServiceHealth> {
        const startTime = Date.now();

        try {
            // Import Redis client dynamically if available
            const { createClient } = await import('redis');
            const client = createClient({ url: process.env.REDIS_URL });

            await client.connect();
            await client.ping();
            await client.disconnect();

            const responseTime = Date.now() - startTime;

            return {
                name: 'Redis',
                status: responseTime < 50 ? 'healthy' : 'degraded',
                responseTime,
                lastChecked: new Date(),
                endpoint: process.env.REDIS_URL,
            };
        } catch (error) {
            logger.warn('Redis health check failed:', error);
            return {
                name: 'Redis',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastChecked: new Date(),
                error: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    }

    /**
     * Track API request metrics
     */
    trackRequest(responseTime: number, isError: boolean = false): void {
        this.requestCounter++;
        this.totalResponseTime += responseTime;
        if (isError) {
            this.errorCounter++;
        }
    }

    /**
     * Track active connections
     */
    incrementActiveConnections(): void {
        this.activeConnections++;
    }

    decrementActiveConnections(): void {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
    }

    /**
     * Get current API metrics
     */
    getApiMetrics() {
        return {
            totalRequests: this.requestCounter,
            activeConnections: this.activeConnections,
            averageResponseTime: this.requestCounter > 0 ? this.totalResponseTime / this.requestCounter : 0,
            errorRate: this.requestCounter > 0 ? this.errorCounter / this.requestCounter : 0,
            uptime: (Date.now() - this.startTime.getTime()) / 1000,
        };
    }

    /**
     * Reset metrics (for testing or periodic resets)
     */
    resetMetrics(): void {
        this.requestCounter = 0;
        this.totalResponseTime = 0;
        this.errorCounter = 0;
        this.startTime = new Date();
    }
}

export default new SystemHealthService();
