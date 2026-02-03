'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Button } from '@/src/components/ui/core/Button';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { Progress } from '@/src/components/ui/data/Progress';
import {
    useDetailedHealthCheck,
    useApiMetrics,
    useDatabaseHealth,
    useExternalServicesHealth,
    useSystemMetrics,
    useResetMetrics,
} from '@/src/core/api/hooks/system/useSystemHealth';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    Database,
    Server,
    Cpu,
    MemoryStick,
    Clock,
    Zap,
    RefreshCw,
    TrendingUp,
    Globe,
} from 'lucide-react';
import { formatBytes, formatDuration } from '@/src/lib/utils/common';

export function SystemHealthClient() {
    const { data: healthReport, isLoading: healthLoading, refetch: refetchHealth } = useDetailedHealthCheck();
    const { data: apiMetrics, isLoading: metricsLoading } = useApiMetrics();
    const { data: dbHealth, isLoading: dbLoading } = useDatabaseHealth();
    const { data: servicesHealth, isLoading: servicesLoading } = useExternalServicesHealth();
    const { data: systemMetrics, isLoading: systemLoading } = useSystemMetrics();
    const { mutate: resetMetrics, isPending: isResetting } = useResetMetrics();

    const getStatusIcon = (status: 'healthy' | 'degraded' | 'unhealthy') => {
        switch (status) {
            case 'healthy':
                return <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />;
            case 'degraded':
                return <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />;
            case 'unhealthy':
                return <AlertCircle className="h-5 w-5 text-[var(--error)]" />;
        }
    };

    const getStatusBadge = (status: 'healthy' | 'degraded' | 'unhealthy') => {
        const variants = {
            healthy: 'success' as const,
            degraded: 'warning' as const,
            unhealthy: 'destructive' as const,
        };
        return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
    };

    if (healthLoading || metricsLoading || dbLoading || servicesLoading || systemLoading) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-32 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Overall Health Status */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-6 w-6" />
                            System Health Dashboard
                        </CardTitle>
                        <CardDescription>Real-time monitoring of system health and performance</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        {healthReport && getStatusBadge(healthReport.overall)}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetchHealth()}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Database Status */}
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                            <Database className="h-8 w-8 text-[var(--info)] mt-1" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold">Database</h3>
                                    {dbHealth && getStatusIcon(dbHealth.status)}
                                </div>
                                {dbHealth && (
                                    <>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Response Time: {dbHealth.responseTime}ms
                                        </p>
                                        {dbHealth.connections && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground">
                                                    Connections: {dbHealth.connections.current} / {dbHealth.connections.available}
                                                </p>
                                                <Progress
                                                    value={(dbHealth.connections.current / dbHealth.connections.available) * 100}
                                                    className="h-2"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* API Performance */}
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                            <Zap className="h-8 w-8 text-[var(--warning)] mt-1" />
                            <div className="flex-1">
                                <h3 className="font-semibold mb-2">API Performance</h3>
                                {apiMetrics && (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Requests:</span>
                                            <span className="font-medium">{apiMetrics.totalRequests.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Avg Response:</span>
                                            <span className="font-medium">{apiMetrics.averageResponseTime.toFixed(2)}ms</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Error Rate:</span>
                                            <span className={`font-medium ${apiMetrics.errorRate > 0.05 ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                                                {(apiMetrics.errorRate * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Active Connections:</span>
                                            <span className="font-medium">{apiMetrics.activeConnections}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* External Services */}
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                            <Globe className="h-8 w-8 text-[var(--primary-blue)] mt-1" />
                            <div className="flex-1">
                                <h3 className="font-semibold mb-2">External Services</h3>
                                {servicesHealth && (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-[var(--success)]">
                                                    {servicesHealth.summary.healthy}
                                                </div>
                                                <div className="text-muted-foreground">Healthy</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-[var(--warning)]">
                                                    {servicesHealth.summary.degraded}
                                                </div>
                                                <div className="text-muted-foreground">Degraded</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-[var(--error)]">
                                                    {servicesHealth.summary.unhealthy}
                                                </div>
                                                <div className="text-muted-foreground">Unhealthy</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* System Resources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CPU & Memory */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" />
                            System Resources
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {systemMetrics && (
                            <>
                                {/* Memory Usage */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MemoryStick className="h-4 w-4 text-[var(--info)]" />
                                            <span className="font-medium">Memory Usage</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {formatBytes(systemMetrics.memory.used)} / {formatBytes(systemMetrics.memory.total)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={systemMetrics.memory.usagePercent}
                                        className="h-3"
                                        indicatorClassName={
                                            systemMetrics.memory.usagePercent > 90
                                                ? 'bg-[var(--error)]'
                                                : systemMetrics.memory.usagePercent > 70
                                                    ? 'bg-[var(--warning)]'
                                                    : 'bg-[var(--success)]'
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {systemMetrics.memory.usagePercent.toFixed(1)}% utilized
                                    </p>
                                </div>

                                {/* CPU Usage */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Cpu className="h-4 w-4 text-[var(--primary-blue)]" />
                                            <span className="font-medium">CPU Usage</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {systemMetrics.cpu.cores} cores
                                        </span>
                                    </div>
                                    <Progress
                                        value={systemMetrics.cpu.usagePercent}
                                        className="h-3"
                                        indicatorClassName={
                                            systemMetrics.cpu.usagePercent > 90
                                                ? 'bg-[var(--error)]'
                                                : systemMetrics.cpu.usagePercent > 70
                                                    ? 'bg-[var(--warning)]'
                                                    : 'bg-[var(--success)]'
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {systemMetrics.cpu.usagePercent.toFixed(1)}% utilized
                                    </p>
                                </div>

                                {/* Uptime */}
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-[var(--success)]" />
                                        <span className="font-medium">System Uptime</span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formatDuration(systemMetrics.uptime)}
                                    </span>
                                </div>

                                {/* Process Uptime */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-[var(--info)]" />
                                        <span className="font-medium">Process Uptime</span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formatDuration(systemMetrics.process.uptime)}
                                    </span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* External Services Detail */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            External Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {servicesHealth && (
                            <div className="space-y-4">
                                {servicesHealth.services.map((service) => (
                                    <div
                                        key={service.name}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(service.status)}
                                            <div>
                                                <p className="font-medium">{service.name}</p>
                                                {service.endpoint && (
                                                    <p className="text-xs text-muted-foreground">{service.endpoint}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {service.responseTime && (
                                                <p className="text-sm font-medium">{service.responseTime}ms</p>
                                            )}
                                            {service.error && (
                                                <p className="text-xs text-[var(--error)]">{service.error}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* API Metrics Control */}
            <Card>
                <CardHeader>
                    <CardTitle>API Metrics Management</CardTitle>
                    <CardDescription>
                        Reset counters to start fresh metrics collection
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="danger"
                        onClick={() => resetMetrics()}
                        disabled={isResetting}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                        Reset API Metrics
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
