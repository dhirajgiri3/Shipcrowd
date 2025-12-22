"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from '@/src/shared/components/card';
import { Select } from '@/src/shared/components/Select';
import { Button } from '@/src/shared/components/button';
import { ChartCard } from '@/components/admin/ChartCard';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Download, Calendar } from 'lucide-react';

const deliveryPerformanceData = [
    { date: '1 Dec', delivered: 120, rto: 5, ndr: 12 },
    { date: '2 Dec', delivered: 132, rto: 4, ndr: 10 },
    { date: '3 Dec', delivered: 101, rto: 8, ndr: 15 },
    { date: '4 Dec', delivered: 145, rto: 6, ndr: 8 },
    { date: '5 Dec', delivered: 160, rto: 7, ndr: 11 },
    { date: '6 Dec', delivered: 152, rto: 5, ndr: 14 },
    { date: '7 Dec', delivered: 170, rto: 6, ndr: 9 },
];

const zoneDistribution = [
    { name: 'North', value: 400 },
    { name: 'South', value: 300 },
    { name: 'West', value: 300 },
    { name: 'East', value: 200 },
    { name: 'North-East', value: 100 },
];

const COLORS = ['#2525FF', '#4338CA', '#10B981', '#F59E0B', '#EF4444'];

export default function AnalyticsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Analytics & Reports</h2>
                <div className="flex items-center gap-2">
                    <Select
                        options={[
                            { label: 'Last 7 Days', value: '7d' },
                            { label: 'Last 30 Days', value: '30d' },
                            { label: 'This Month', value: 'month' },
                        ]}
                        className="w-40"
                    />
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" /> Export PDF
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard title="Delivery Performance Trend" height={350}>
                    <AreaChart data={deliveryPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2525FF" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#2525FF" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                backgroundColor: '#fff',
                                padding: '12px'
                            }}
                            labelStyle={{ color: '#111827', fontWeight: 600 }}
                            itemStyle={{ color: '#111827', fontSize: '14px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Area type="monotone" dataKey="delivered" stroke="#2525FF" fillOpacity={1} fill="url(#colorDelivered)" name="Delivered" />
                        <Area type="monotone" dataKey="ndr" stroke="#F59E0B" fill="none" name="NDR" />
                        <Area type="monotone" dataKey="rto" stroke="#EF4444" fill="none" name="RTO" />
                    </AreaChart>
                </ChartCard>

                <ChartCard title="Zone-wise Distribution" height={350}>
                    <PieChart>
                        <Pie
                            data={zoneDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={110}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {zoneDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                backgroundColor: '#fff',
                                padding: '12px'
                            }}
                            labelStyle={{ color: '#111827', fontWeight: 600 }}
                            itemStyle={{ color: '#111827', fontSize: '14px' }}
                        />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                    </PieChart>
                </ChartCard>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Detailed Report Table</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[var(--bg-secondary)] border-b border-gray-100 text-[var(--text-muted)]">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Date</th>
                                        <th className="px-6 py-3 font-medium">Total Orders</th>
                                        <th className="px-6 py-3 font-medium">Delivered</th>
                                        <th className="px-6 py-3 font-medium">RTO %</th>
                                        <th className="px-6 py-3 font-medium">Avg. TAT</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {deliveryPerformanceData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-[var(--bg-secondary)]">
                                            <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{row.date}</td>
                                            <td className="px-6 py-4">{row.delivered + row.ndr + row.rto}</td>
                                            <td className="px-6 py-4 text-emerald-600 font-medium">{row.delivered}</td>
                                            <td className="px-6 py-4 text-rose-600 font-medium">{((row.rto / (row.delivered + row.ndr + row.rto)) * 100).toFixed(1)}%</td>
                                            <td className="px-6 py-4 text-[var(--text-muted)]">2.4 days</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
