"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChartCard } from '@/components/admin/ChartCard';
import { MOCK_PREDICTIONS, MOCK_ANOMALIES, MOCK_AI_INSIGHTS } from '@/lib/mockData';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ComposedChart, Line
} from 'recharts';
import {
    BrainCircuit, Sparkles, AlertTriangle, TrendingUp, Zap,
    MessageSquare, ArrowRight, Target
} from 'lucide-react';

export default function IntelligencePage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-indigo-600" />
                        AI Command Center
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Real-time predictive insights & anomalies</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Zap className="h-4 w-4 mr-2" /> Run Analysis
                </Button>
            </div>

            {/* 1. AI Insights Cards */}
            <div className="grid gap-6 lg:grid-cols-3">
                {MOCK_AI_INSIGHTS.map((insight, idx) => (
                    <Card key={idx} className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-white to-indigo-50/30">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="bg-white border-indigo-100 text-indigo-700">
                                    {insight.impact} Impact
                                </Badge>
                                <BrainCircuit className="h-5 w-5 text-indigo-400" />
                            </div>
                            <CardTitle className="text-lg mt-2">{insight.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 mb-4">{insight.description}</p>
                            <Button size="sm" variant="secondary" className="w-full justify-between group">
                                {insight.action}
                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* 2. Predictive Forecasting Chart */}
                <ChartCard title="Demand Forecast (Next 7 Days)" height={350} className="col-span-2">
                    <ComposedChart data={MOCK_PREDICTIONS} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <defs>
                            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#f5f5f5" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                backgroundColor: '#fff',
                                padding: '12px'
                            }}
                            labelStyle={{ color: '#111827', fontWeight: 600 }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="predicted" name="AI Prediction" stroke="#6366f1" fill="url(#colorPredicted)" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="actual" name="Actual Orders" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                </ChartCard>

                {/* 3. Anomaly Detection Feed */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Detected Anomalies
                        </CardTitle>
                        <CardDescription>Unusual patterns requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {MOCK_ANOMALIES.map((anomaly) => (
                            <div key={anomaly.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${anomaly.severity === 'critical' ? 'bg-rose-100 text-rose-700' :
                                        anomaly.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {anomaly.type}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{anomaly.timestamp}</span>
                                </div>
                                <p className="text-sm text-gray-700 leading-snug">{anomaly.message}</p>
                            </div>
                        ))}
                        <Button variant="ghost" className="w-full text-xs text-gray-500 mt-2">
                            View All System Logs
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* 4. Feature Showcase: Smart Routing */}
            <Card className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white border-0">
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border-0">
                                <Target className="h-3 w-3 mr-1" /> Smart Routing Engine
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Optimize Your Logistics with AI</h3>
                        <p className="text-gray-300 max-w-xl">
                            Our ML models analyze 50+ parameters (traffic, weather, courier performance) to select the best carrier for every shipment, saving you up to 18% on shipping costs.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                            Configure Rules
                        </Button>
                        <Button className="bg-indigo-500 hover:bg-indigo-600 border-0">
                            Enable Auto-Switch
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
