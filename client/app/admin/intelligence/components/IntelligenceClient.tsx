"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { Loader2 } from 'lucide-react';
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
        <motion.div
            className="space-y-6 pb-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <motion.div variants={itemVariants}>
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] mb-1 bg-[var(--primary-blue-soft)] w-fit px-3 py-1 rounded-full">
                        <BrainCircuit className="w-3.5 h-3.5" />
                        <span>AI Command Center</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                        Intelligence & Insights
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1 max-w-2xl">
                        Real-time predictive analytics and anomaly detection powered by machine learning models to optimize your logistics.
                    </p>
                </motion.div>
                <motion.div variants={itemVariants} className="flex gap-3">
                    <Button variant="outline" className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-subtle)]">
                        <Activity className="h-4 w-4 mr-2" />
                        Live Monitor
                    </Button>
                    <Button className="bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all">
                        <Zap className="h-4 w-4 mr-2" />
                        Run Deep Analysis
                    </Button>
                </motion.div>
            </div>

            {/* 1. AI Insights Cards */}
            <motion.div variants={containerVariants} className="grid gap-6 lg:grid-cols-3">
                {insights.map((insight, idx) => {
                    const isCritical = insight.impact === 'High';
                    return (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            whileHover={{ y: -5 }}
                            className={cn(
                                "relative overflow-hidden rounded-2xl border bg-[var(--bg-primary)] p-6 transition-all duration-300",
                                isCritical
                                    ? "border-[var(--warning-border)] shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                    : "border-[var(--border-subtle)] hover:border-[var(--primary-blue)] hover:shadow-lg hover:shadow-blue-500/5"
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
                                        {insight.impact} Impact
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
                                >
                                    {insight.action}
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
                                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
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
                                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
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
                                        <Button variant="link" className="p-0 h-auto text-xs text-[var(--primary-blue)] hover:no-underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            Investigate <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    </motion.div>
                                ))
                            )}
                        </CardContent>
                        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
                            <Button variant="outline" className="w-full text-xs text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-primary)]">
                                View Full System Logs
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* 4. Feature Showcase: Smart Routing */}
            <motion.div variants={itemVariants}>
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#172554] p-1">
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
                    <div className="absolute top-0 right-0 p-12 bg-[var(--primary-blue)]/20 rounded-full blur-3xl" />

                    <div className="relative bg-[var(--bg-primary)]/10 backdrop-blur-sm rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 h-full">
                        <div className="space-y-4 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] border border-[var(--primary-blue)]/20 text-xs font-semibold uppercase tracking-wider">
                                <Target className="h-3.5 w-3.5" />
                                <span>Smart Routing Engine</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tight">Optimize Your Logistics with AI</h3>
                            <p className="text-blue-100/80 text-lg leading-relaxed">
                                Our machine learning models analyze <span className="text-white font-semibold">50+ parameters</span> (traffic, weather, courier performance) to automatically select the best carrier for every shipment, saving you up to <span className="text-emerald-400 font-bold">18%</span> on shipping costs.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <Button variant="outline" className="border-white/10 text-white hover:bg-white/10 hover:text-white backdrop-blur-md h-12 px-6">
                                Configure Rules
                            </Button>
                            <Button className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white border-none h-12 px-6 shadow-xl shadow-[var(--primary-blue)]/20">
                                Enable Auto-Switch
                                <ArrowUpRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
