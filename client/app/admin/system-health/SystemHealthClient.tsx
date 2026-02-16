'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Button } from '@/src/components/ui/core/Button';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import { PageHeaderSkeleton, CardSkeleton } from '@/src/components/ui/data/Skeleton';
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
    const [showResetDialog, setShowResetDialog] = useState(false);

    const { data: healthReport, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useDetailedHealthCheck();
    const { data: apiMetrics, isLoading: metricsLoading } = useApiMetrics();
    const { data: dbHealth, isLoading: dbLoading } = useDatabaseHealth();
    const { data: servicesHealth, isLoading: servicesLoading } = useExternalServicesHealth();
    const { data: systemMetrics, isLoading: systemLoading } = useSystemMetrics();
    const { mutate: resetMetrics, isPending: isResetting } = useResetMetrics();

    const isLoading = healthLoading || metricsLoading || dbLoading || servicesLoading || systemLoading;

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
            unhealthy: 'error' as const,
        };
        return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
    };

    const getDbVariant = (): 'success' | 'warning' | 'critical' | 'info' => {
        if (!dbHealth) return 'info';
        switch (dbHealth.status) {
            case 'healthy': return 'success';
            case 'degraded': return 'warning';
            case 'unhealthy': return 'critical';
            default: return 'info';
        }
    };

    const getServicesVariant = (): 'success' | 'warning' | 'critical' | 'default' => {
        if (!servicesHealth) return 'default';
        const { healthy, degraded, unhealthy } = servicesHealth.summary;
        const total = healthy + degraded + unhealthy;
        if (unhealthy > 0) return 'critical';
        if (degraded > 0) return 'warning';
        return 'success';
    };

    if (isLoading) {
        return (
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 bg-[var(--bg-secondary)] min-h-screen pb-20">
                <PageHeaderSkeleton />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CardSkeleton className="h-96" />
                    <CardSkeleton className="h-96" />
                </div>
            </div>
        );
    }

    if (healthError || !healthReport) {
        return (
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto bg-[var(--bg-secondary)] min-h-screen flex items-center justify-center">
                <EmptyState
                    variant="error"
                    title="Failed to load system health"
                    description="Unable to fetch system health data. Please check your connection and try again."
                    action={{
                        label: 'Retry',
                        onClick: () => refetchHealth(),
                        variant: 'outline',
                    }}
                />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 bg-[var(--bg-secondary)] min-h-screen pb-20">
            <PageHeader
                title="System Health"
                description="Real-time monitoring of system health and performance"
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'System Health', active: true }]}
                actions={
                    <>
                        {getStatusBadge(healthReport.overall)}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetchHealth()}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </>
                }
            />

            {/* StatsCard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Database"
                    value={dbHealth ? `${dbHealth.responseTime ?? 0}ms` : '—'}
                    icon={Database}
                    variant={getDbVariant()}
                    description={dbHealth ? `${dbHealth.status}` : 'Checking...'}
                />
                <StatsCard
                    title="API Requests"
                    value={apiMetrics ? apiMetrics.totalRequests.toLocaleString() : '—'}
                    icon={Zap}
                    variant="default"
                    description={apiMetrics ? `Avg ${apiMetrics.averageResponseTime.toFixed(0)}ms` : undefined}
                />
                <StatsCard
                    title="Error Rate"
                    value={apiMetrics ? `${(apiMetrics.errorRate * 100).toFixed(2)}%` : '—'}
                    icon={AlertCircle}
                    variant={apiMetrics && apiMetrics.errorRate > 0.05 ? 'critical' : 'success'}
                />
                <StatsCard
                    title="External Services"
                    value={servicesHealth ? `${servicesHealth.summary.healthy} / ${servicesHealth.summary.total} healthy` : '—'}
                    icon={Globe}
                    variant={getServicesVariant()}
                />
            </div>

            {/* System Resources & External Services Detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CPU & Memory */}
                <Card className="border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
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
                                            <span className="font-medium text-[var(--text-primary)]">Memory Usage</span>
                                        </div>
                                        <span className="text-sm text-[var(--text-muted)]">
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
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {systemMetrics.memory.usagePercent.toFixed(1)}% utilized
                                    </p>
                                </div>

                                {/* CPU Usage */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Cpu className="h-4 w-4 text-[var(--primary-blue)]" />
                                            <span className="font-medium text-[var(--text-primary)]">CPU Usage</span>
                                        </div>
                                        <span className="text-sm text-[var(--text-muted)]">
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
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {systemMetrics.cpu.usagePercent.toFixed(1)}% utilized
                                    </p>
                                </div>

                                {/* Uptime */}
                                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-[var(--success)]" />
                                        <span className="font-medium text-[var(--text-primary)]">System Uptime</span>
                                    </div>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                        {formatDuration(systemMetrics.uptime)}
                                    </span>
                                </div>

                                {/* Process Uptime */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-[var(--info)]" />
                                        <span className="font-medium text-[var(--text-primary)]">Process Uptime</span>
                                    </div>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                        {formatDuration(systemMetrics.process.uptime)}
                                    </span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* External Services Detail */}
                <Card className="border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
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
                                        className="flex items-center justify-between p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(service.status)}
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{service.name}</p>
                                                {service.endpoint && (
                                                    <p className="text-xs text-[var(--text-muted)]">{service.endpoint}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {service.responseTime && (
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{service.responseTime}ms</p>
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

            {/* API Metrics Management */}
            <Card className="border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <CardHeader>
                    <CardTitle className="text-[var(--text-primary)]">API Metrics Management</CardTitle>
                    <CardDescription className="text-[var(--text-secondary)]">
                        Reset counters to start fresh metrics collection
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="danger"
                        onClick={() => setShowResetDialog(true)}
                        disabled={isResetting}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                        Reset API Metrics
                    </Button>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={showResetDialog}
                title="Reset API Metrics"
                description="This will reset all request counters and metrics. Data collection will start fresh. This action cannot be undone."
                confirmText="Reset Metrics"
                confirmVariant="danger"
                onCancel={() => setShowResetDialog(false)}
                onConfirm={() => {
                    resetMetrics();
                    setShowResetDialog(false);
                }}
                isLoading={isResetting}
            />
        </div>
    );
}
