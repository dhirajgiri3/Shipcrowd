"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Package, AlertTriangle, CheckCircle2, ShoppingCart, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Mock activity data with timestamps for animation
const initialActivities = [
    { id: 1, type: 'order', message: 'New order #ORD-8821 received from Aarav Patel', time: '2 mins ago', icon: ShoppingCart, color: 'text-blue-500 bg-blue-50', isNew: false },
    { id: 2, type: 'shipment', message: 'Shipment #SHP-9921 delivered to Mumbai Hub', time: '15 mins ago', icon: Package, color: 'text-indigo-500 bg-indigo-50', isNew: false },
    { id: 3, type: 'alert', message: 'Low wallet balance for Alpha Logistics', time: '1 hour ago', icon: AlertTriangle, color: 'text-amber-500 bg-amber-50', isNew: false },
    { id: 4, type: 'success', message: 'Weekly settlement report generated successfully', time: '2 hours ago', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50', isNew: false },
];

const liveUpdates = [
    { type: 'order', message: 'New order #ORD-8825 placed by Diya Rao', icon: ShoppingCart, color: 'text-blue-500 bg-blue-50' },
    { type: 'shipment', message: 'Pickup completed for AWB-12345678', icon: Package, color: 'text-indigo-500 bg-indigo-50' },
    { type: 'success', message: 'Payment of ₹15,000 received from Omega Corp', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
];

export function ActivityFeed() {
    const [activities, setActivities] = useState(initialActivities);
    const [updateIndex, setUpdateIndex] = useState(0);

    // Simulate live updates every 8 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const newActivity = {
                ...liveUpdates[updateIndex % liveUpdates.length],
                id: Date.now(),
                time: 'Just now',
                isNew: true,
            };

            setActivities(prev => [newActivity, ...prev.slice(0, 4)]);
            setUpdateIndex(prev => prev + 1);

            // Remove "new" highlight after 3 seconds
            setTimeout(() => {
                setActivities(prev =>
                    prev.map(a => a.id === newActivity.id ? { ...a, isNew: false } : a)
                );
            }, 3000);
        }, 8000);

        return () => clearInterval(interval);
    }, [updateIndex]);

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    Recent Activity
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities.map((activity, idx) => (
                        <div
                            key={activity.id}
                            className={`flex gap-4 relative transition-all duration-500 ${activity.isNew ? 'animate-in slide-in-from-top-2 bg-emerald-50/50 -mx-2 px-2 py-1 rounded-lg' : ''
                                }`}
                        >
                            {/* Connector Line */}
                            {idx !== activities.length - 1 && (
                                <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-gray-100" />
                            )}

                            <div className={`relative z-10 flex-none w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}>
                                <activity.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 py-1">
                                <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                    {activity.time}
                                    {activity.isNew && (
                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded">NEW</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export function AlertSection() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-800">Integration Alert</h4>
                    <p className="text-sm text-amber-700 mt-1">
                        Shopify API token for <span className="font-medium">Beta Logistics</span> is expiring in 2 days. Update it to prevent sync issues.
                    </p>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="p-1 hover:bg-amber-100 rounded transition-colors"
                >
                    <X className="h-4 w-4 text-amber-600" />
                </button>
            </div>
        </div>
    );
}
