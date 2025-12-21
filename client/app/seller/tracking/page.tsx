"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
    Search,
    Package,
    MapPin,
    Calendar,
    Truck,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

// Mock tracking data
const mockTrackingData = {
    awb: 'DL2312345',
    status: 'in-transit',
    courier: 'Delhivery',
    origin: 'Mumbai',
    destination: 'Delhi',
    estimatedDelivery: '2024-12-13',
    weight: '0.5 kg',
    customer: 'Rahul Sharma',
    events: [
        { timestamp: '2024-12-11 08:30', location: 'Mumbai Hub', status: 'Shipment Picked Up', icon: Package },
        { timestamp: '2024-12-11 14:45', location: 'Mumbai Airport', status: 'In Transit to Destination City', icon: Truck },
        { timestamp: '2024-12-11 18:00', location: 'Delhi Airport', status: 'Arrived at Destination City', icon: MapPin },
        { timestamp: '2024-12-12 09:00', location: 'Delhi Hub', status: 'Out for Delivery', icon: Truck },
    ]
};

const recentTracking = [
    { awb: 'DL2312345', status: 'in-transit', destination: 'Delhi', date: '2024-12-11' },
    { awb: 'XB4567890', status: 'delivered', destination: 'Bangalore', date: '2024-12-10' },
    { awb: 'DT9876543', status: 'ndr', destination: 'Chennai', date: '2024-12-09' },
    { awb: 'BD1234567', status: 'pending', destination: 'Kolkata', date: '2024-12-09' },
];

export default function TrackingPage() {
    const [awbInput, setAwbInput] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    const [trackingResult, setTrackingResult] = useState<typeof mockTrackingData | null>(null);
    const { addToast } = useToast();

    const handleTrack = () => {
        if (!awbInput.trim()) {
            addToast('Please enter an AWB number', 'error');
            return;
        }
        setIsTracking(true);
        // Simulate API call
        setTimeout(() => {
            setTrackingResult(mockTrackingData);
            setIsTracking(false);
            addToast('Shipment found!', 'success');
        }, 1000);
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'neutral', label: string }> = {
            'delivered': { variant: 'success', label: 'Delivered' },
            'in-transit': { variant: 'neutral', label: 'In Transit' },
            'ndr': { variant: 'error', label: 'NDR' },
            'pending': { variant: 'warning', label: 'Pending' },
        };
        const config = statusMap[status] || { variant: 'neutral', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Search Section */}
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
                <CardContent className="pt-6">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Track Your Shipment</h2>
                        <p className="text-gray-600 mt-1">Enter AWB number to get real-time tracking updates</p>
                    </div>
                    <div className="flex gap-3 max-w-xl mx-auto">
                        <div className="flex-1">
                            <Input
                                placeholder="Enter AWB number (e.g. DL2312345)"
                                value={awbInput}
                                onChange={(e) => setAwbInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                                icon={<Search className="h-4 w-4" />}
                                className="bg-[var(--bg-primary)]"
                            />
                        </div>
                        <Button
                            onClick={handleTrack}
                            disabled={isTracking}
                            className="bg-[#2525FF] hover:bg-[#1e1ecc]"
                        >
                            {isTracking ? 'Tracking...' : 'Track'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tracking Result */}
            {trackingResult && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-indigo-600" />
                                    AWB: {trackingResult.awb}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {trackingResult.courier} • {trackingResult.weight}
                                </CardDescription>
                            </div>
                            {getStatusBadge(trackingResult.status)}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Route Info */}
                        <div className="flex items-center gap-4 mb-6 p-4 bg-[var(--bg-secondary)] rounded-lg">
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">From</p>
                                <p className="font-semibold text-[var(--text-primary)]">{trackingResult.origin}</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400" />
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">To</p>
                                <p className="font-semibold text-[var(--text-primary)]">{trackingResult.destination}</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-xs text-[var(--text-muted)]">Expected Delivery</p>
                                <p className="font-semibold text-indigo-600">{trackingResult.estimatedDelivery}</p>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                            <div className="space-y-4">
                                {trackingResult.events.map((event, idx) => {
                                    const Icon = event.icon;
                                    return (
                                        <div key={idx} className="relative flex gap-4 pl-10">
                                            <div className="absolute left-2 p-1.5 bg-[var(--bg-primary)] border-2 border-indigo-500 rounded-full">
                                                <Icon className="h-3 w-3 text-indigo-600" />
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <p className="font-medium text-[var(--text-primary)]">{event.status}</p>
                                                <p className="text-sm text-[var(--text-muted)]">{event.location}</p>
                                                <p className="text-xs text-gray-400 mt-1">{event.timestamp}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Tracking */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-600" />
                        Recently Tracked
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {recentTracking.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                                onClick={() => {
                                    setAwbInput(item.awb);
                                    handleTrack();
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[var(--bg-tertiary)] rounded-lg">
                                        <Package className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-[var(--text-primary)]">{item.awb}</p>
                                        <p className="text-xs text-[var(--text-muted)]">To: {item.destination}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400">{item.date}</span>
                                    {getStatusBadge(item.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
