"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { showSuccessToast } from '@/src/lib/error';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ComposedChart, Line, ResponsiveContainer
} from 'recharts';
import {
    BrainCircuit, AlertTriangle, TrendingUp, Zap,
    MessageSquare, ArrowRight, Target, Sparkles,
    Activity, ArrowUpRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAIPredictions, useAnomalyDetection, useAIInsights, useUpdateAnomalyStatus, useDemandForecast } from '@/src/core/api/hooks/admin/intelligence/useAdminIntelligence';

export function IntelligenceClient() {
    // API Hooks
    const { data: predictionsData, isLoading: isPredictionsLoading } = useAIPredictions();
    const { data: anomaliesData, isLoading: isAnomaliesLoading } = useAnomalyDetection();
    const { data: insightsData, isLoading: isInsightsLoading } = useAIInsights();
    const { data: forecastData, isLoading: isForecastLoading } = useDemandForecast(30);

    const predictions = predictionsData?.predictions || [];
    const anomalies = anomaliesData?.anomalies || [];
    const insights = insightsData?.insights || [];
    const forecastTimeSeries = forecastData?.forecast || [];

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen">
            <PageHeader
                title="Intelligence & Insights"
                description="Real-time predictive analytics and anomaly detection powered by machine learning models to optimize your logistics."
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Intelligence', active: true }]}
                actions={
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                            onClick={() => showSuccessToast('Feature coming soon')}
                        >
                            <Activity className="h-4 w-4 mr-2" />
                            Live Monitor
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => showSuccessToast('Feature coming soon')}
                        >
                            <Zap className="h-4 w-4 mr-2" />
                            Run Deep Analysis
                        </Button>
                    </div>
                }
            />

            <motion.div
                className="space-y-6 pb-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

            {/* 1. AI Insights Cards */}
            <motion.div variants={containerVariants} className="grid gap-6 lg:grid-cols-3">
                {insights.map((insight, idx) => {
                    const isCritical = insight.priority === 'high';
                    const impactLabel = typeof insight.impact === 'string'
                        ? insight.impact
                        : (insight.impact as { formatted?: string })?.formatted ?? insight.priority;
                    const actionLabel = typeof insight.action === 'string'
                        ? insight.action
                        : (insight.action as { label?: string })?.label ?? 'View details';
                    return (
                        <motion.div
                            key={insight.id ?? idx}
                            variants={itemVariants}
                            whileHover={{ y: -5 }}
                            className={cn(
                                "relative overflow-hidden rounded-2xl border bg-[var(--bg-primary)] p-6 transition-all duration-300",
                                isCritical
                                    ? "border-[var(--warning-border)] shadow-[0_0_15px_var(--warning-bg)]"
                                    : "border-[var(--border-subtle)] hover:border-[var(--primary-blue)] hover:shadow-[0_0_20px_var(--primary-blue-soft)]"
                            )}
                        >
                            {/* Background Glow */}
                            <div className={cn(
                                "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none",
                                isCritical ? "bg-[var(--warning)]" : "bg-[var(--primary-blue)]"
                            )} />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn(
                                        "p-2.5 rounded-xl",
                                        isCritical ? "bg-[var(--warning-bg)] text-[var(--warning)]" : "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]"
                                    )}>
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <Badge variant={isCritical ? "warning" : "default"} className="uppercase tracking-wider text-[10px] font-bold">
                                        {impactLabel}
                                    </Badge>
                                </div>

                                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--primary-blue)] transition-colors">
                                    {insight.title}
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)] mb-6 flex-grow leading-relaxed">
                                    {insight.description}
                                </p>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-between group/btn bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:text-[var(--primary-blue)] rounded-xl border border-transparent hover:border-[var(--border-subtle)]"
                                    onClick={() => showSuccessToast('Feature coming soon')}
                                >
                                    {actionLabel}
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                </Button>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* 2. Predictive Forecasting Chart */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="h-full bg-[var(--bg-primary)] border-[var(--border-subtle)]">
                        <CardHeader>
                            <CardTitle>Demand Forecast AI Model</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="neutral" className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                        Confidence: {forecastData?.accuracy ? `${forecastData.accuracy}%` : '94%'}
                                    </Badge>
                                    <Badge variant="neutral" className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                        Model: {forecastData?.modelVersion || 'v2.4 (XGBoost)'}
                                    </Badge>
                                </div>
                            </div>
                            {isForecastLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader variant="spinner" size="lg" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={forecastTimeSeries} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <defs>
                                            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary-blue)" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="var(--primary-blue)" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                                            axisLine={false}
                                            tickLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-subtle)',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                backgroundColor: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                padding: '12px'
                                            }}
                                            cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Area
                                            type="monotone"
                                            dataKey="predicted"
                                            name="AI Prediction (Upper Bound)"
                                            stroke="var(--primary-blue)"
                                            strokeWidth={3}
                                            fill="url(#colorPredicted)"
                                            className="drop-shadow-sm"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="actual"
                                            name="Actual Orders"
                                            stroke="var(--success)"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: 'var(--bg-primary)', strokeWidth: 2 }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 3. Anomaly Detection Feed */}
                <motion.div variants={itemVariants}>
                    <Card className="h-full bg-[var(--bg-primary)] border-[var(--border-subtle)] flex flex-col">
                        <CardHeader className="border-b border-[var(--border-subtle)] pb-4">
                            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                                <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
                                Anomaly Detection
                            </CardTitle>
                            <CardDescription className="text-[var(--text-muted)]">
                                Real-time pattern deviations
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto pt-6 space-y-4 pr-2 custom-scrollbar">
                            {isAnomaliesLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader variant="spinner" size="lg" />
                                </div>
                            ) : anomalies.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                    <AlertTriangle className="h-12 w-12 text-[var(--text-muted)] mb-3 opacity-50" />
                                    <p className="text-sm text-[var(--text-muted)]">No anomalies detected</p>
                                </div>
                            ) : (
                                anomalies.map((anomaly, i) => (
                                    <motion.div
                                        key={anomaly.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="relative group p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] transition-all duration-200"
                                    >
                                        <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-transparent via-[var(--border-strong)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge
                                                variant={anomaly.severity === 'critical' ? 'destructive' : anomaly.severity === 'high' ? 'warning' : 'neutral'}
                                                className="px-2 py-0.5 text-[10px] uppercase font-bold"
                                            >
                                                {anomaly.category}
                                            </Badge>
                                            <span className="text-[10px] font-mono text-[var(--text-muted)]">{new Date(anomaly.detectedAt).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed mb-1">{anomaly.description}</p>
                                        <Button
                                            variant="link"
                                            className="p-0 h-auto text-xs text-[var(--primary-blue)] hover:no-underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                            onClick={() => showSuccessToast('Feature coming soon')}
                                        >
                                            Investigate <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    </motion.div>
                                ))
                            )}
                        </CardContent>
                        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
                            <Button
                                variant="outline"
                                className="w-full text-xs text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-primary)]"
                                onClick={() => showSuccessToast('Feature coming soon')}
                            >
                                View Full System Logs
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* 4. Smart Routing Hero - WalletHero-style */}
            <motion.div variants={itemVariants}>
                <div
                    className={cn(
                        'relative overflow-hidden rounded-[var(--radius-2xl)] p-6 sm:p-8',
                        'bg-gradient-to-br from-[var(--wallet-hero-from)] via-[var(--wallet-hero-via)] to-[var(--wallet-hero-to)]',
                        'border border-[var(--wallet-hero-border)]'
                    )}
                >
                    {/* Gradient orbs - WalletHero style */}
                    <div className="absolute -top-20 -right-20 w-72 h-72 sm:w-80 sm:h-80 bg-[var(--primary-blue)]/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute top-1/2 -left-24 w-48 h-48 sm:w-56 sm:h-56 bg-[var(--info)]/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 right-1/3 w-40 h-40 sm:w-48 sm:h-48 bg-[var(--wallet-hero-orb-pink)] rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8">
                        {/* Left: Content + CTA (with accent bar) */}
                        <div className="flex-1 min-w-0 space-y-6 border-l-4 border-[var(--primary-blue)] pl-4 sm:pl-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-[var(--primary-blue)]/10">
                                    <Target className="w-6 h-6 text-[var(--primary-blue)]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Smart Routing Engine
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        AI-powered carrier selection
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                                    Optimize Your Logistics with AI
                                </h3>
                                <p className="mt-3 text-[var(--text-secondary)] text-base leading-relaxed">
                                    Our machine learning models analyze <span className="font-semibold text-[var(--text-primary)]">50+ parameters</span> (traffic, weather, courier performance) to automatically select the best carrier for every shipment, saving you up to <span className="font-bold text-[var(--success)]">18%</span> on shipping costs.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <Button
                                    onClick={() => showSuccessToast('Feature coming soon')}
                                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white hover:opacity-95 font-bold text-sm border-0"
                                >
                                    Enable Auto-Switch
                                    <ArrowUpRight className="w-5 h-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => showSuccessToast('Feature coming soon')}
                                    className="h-12 px-5 rounded-xl bg-[var(--wallet-hero-card)] hover:bg-[var(--wallet-hero-card-hover)] text-[var(--text-primary)] border border-[var(--wallet-hero-card-border)] font-medium text-sm"
                                >
                                    Configure Rules
                                </Button>
                            </div>
                        </div>

                        {/* Right: Feature highlights - WalletHero card style */}
                        <div className="md:w-72 lg:w-80 shrink-0 flex flex-col gap-4">
                            <div className="rounded-xl bg-[var(--wallet-hero-card)] border border-[var(--wallet-hero-card-border)] p-4">
                                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                                    Key Benefits
                                </p>
                                <ul className="space-y-2 text-sm text-[var(--text-primary)]">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                                        Auto-select best carrier per shipment
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                                        Real-time traffic & weather data
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                                        Up to 18% cost savings
                                    </li>
                                </ul>
                            </div>
                            <div className="rounded-xl bg-[var(--wallet-hero-card)] border border-[var(--wallet-hero-card-border)] p-4">
                                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                                    Model Status
                                </p>
                                <p className="text-sm font-medium text-[var(--success)] flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                                    Ready to enable
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
        </div>
    );
}
