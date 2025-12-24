"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { Button } from '@/src/shared/components/button';
import { Input } from '@/src/shared/components/Input';
import { Badge } from '@/src/shared/components/badge';
import {
    Search,
    Package,
    MapPin,
    Calendar,
    Truck,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowRight,
    Loader2,
    History,
    Plane,
    Box
} from 'lucide-react';
import { useToast } from '@/src/shared/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/shared/utils';

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
        { id: 1, timestamp: '2024-12-11 08:30', location: 'Mumbai Hub', status: 'Shipment Picked Up', icon: Package, done: true },
        { id: 2, timestamp: '2024-12-11 14:45', location: 'Mumbai Airport', status: 'In Transit to Destination City', icon: Plane, done: true },
        { id: 3, timestamp: '2024-12-11 18:00', location: 'Delhi Airport', status: 'Arrived at Destination City', icon: MapPin, done: true },
        { id: 4, timestamp: '2024-12-12 09:00', location: 'Delhi Hub', status: 'Out for Delivery', icon: Truck, done: false },
        { id: 5, timestamp: '', location: 'Doorstep', status: 'Delivered', icon: CheckCircle2, done: false },
    ]
};

const recentTracking = [
    { awb: 'DL2312345', status: 'in-transit', destination: 'Delhi', date: 'Dec 11' },
    { awb: 'XB4567890', status: 'delivered', destination: 'Bangalore', date: 'Dec 10' },
    { awb: 'DT9876543', status: 'ndr', destination: 'Chennai', date: 'Dec 09' },
    { awb: 'BD1234567', status: 'pending', destination: 'Kolkata', date: 'Dec 09' },
];

export default function TrackingPage() {
    const [awbInput, setAwbInput] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    const [trackingResult, setTrackingResult] = useState<typeof mockTrackingData | null>(null);
    const { addToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const handleTrack = () => {
        if (!awbInput.trim()) {
            addToast('Please enter an AWB number', 'warning');
            return;
        }
        setIsTracking(true);
        // Simulate API call
        setTimeout(() => {
            setTrackingResult(mockTrackingData);
            setIsTracking(false);
            addToast('Shipment found!', 'success');
        }, 1500);
    };

    const getStatusConfig = (status: string) => {
        const statusMap: Record<string, { color: string, label: string, icon: any }> = {
            'delivered': { color: 'emerald', label: 'Delivered', icon: CheckCircle2 },
            'in-transit': { color: 'blue', label: 'In Transit', icon: Truck },
            'ndr': { color: 'rose', label: 'Exception', icon: AlertTriangle },
            'pending': { color: 'amber', label: 'Pending', icon: Clock },
        };
        return statusMap[status] || { color: 'gray', label: status, icon: Package };
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 pb-20"
        >
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            Real-time Logistics
                        </span>
                    </div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-4xl font-black text-[var(--text-primary)] tracking-tight"
                    >
                        Track Shipment
                    </motion.h1>
                    <p className="text-[var(--text-secondary)] mt-1 font-medium">Trace any package across our global network.</p>
                </div>
            </div>

            {/* Search Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-10 rounded-[32px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-xl shadow-blue-500/5 relative overflow-hidden"
            >
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[var(--primary-blue)]/5 via-transparent to-transparent rounded-bl-[100%] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-gradient-to-tr from-[var(--bg-secondary)]/50 to-transparent rounded-tr-[100%] pointer-events-none" />

                <div className="max-w-3xl relative z-10 mx-auto text-center">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
                        Where is your shipment?
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)] group-focus-within:text-[var(--primary-blue)] transition-colors" />
                            <Input
                                placeholder="Enter AWB or Order ID (e.g. DL2312345)"
                                value={awbInput}
                                onChange={(e) => setAwbInput(e.target.value)}
                                className="pl-14 h-16 rounded-[20px] bg-[var(--bg-secondary)] border-2 border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] text-lg transition-all shadow-inner"
                                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                            />
                        </div>
                        <Button
                            onClick={handleTrack}
                            disabled={isTracking}
                            className="h-16 px-10 rounded-[20px] bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] shadow-lg shadow-blue-500/20 text-lg font-bold transition-all hover:scale-105"
                        >
                            {isTracking ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Track'}
                        </Button>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Result Column */}
                <div className="lg:col-span-2 space-y-6">
                    <AnimatePresence mode="wait">
                        {trackingResult ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                            >
                                {/* Results Card */}
                                <div className="p-8 rounded-[32px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden relative">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-8 border-b border-[var(--border-subtle)]">
                                        <div>
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                                    <Box className="h-8 w-8 text-[var(--primary-blue)]" />
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{trackingResult.awb}</h3>
                                                    <p className="text-sm text-[var(--text-muted)] font-bold uppercase tracking-wider">{trackingResult.courier} Logistics</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-5 py-3 rounded-2xl flex items-center gap-3 bg-${getStatusConfig(trackingResult.status).color}-500/10 text-${getStatusConfig(trackingResult.status).color}-600 border border-${getStatusConfig(trackingResult.status).color}-500/20 shadow-sm`}>
                                            {(() => {
                                                const config = getStatusConfig(trackingResult.status);
                                                const StatusIcon = config.icon;
                                                return <StatusIcon className="h-6 w-6" />;
                                            })()}
                                            <span className="font-bold text-lg">{getStatusConfig(trackingResult.status).label}</span>
                                        </div>
                                    </div>

                                    {/* Journey Visual */}
                                    <div className="relative h-24 mb-12 mx-4">
                                        {/* Connecting Line */}
                                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-[var(--bg-tertiary)] -translate-y-1/2 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '60%' }}
                                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                                className="h-full bg-[var(--primary-blue)] relative"
                                            >
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-ping" />
                                            </motion.div>
                                        </div>

                                        <div className="absolute top-1/2 left-0 -translate-y-1/2 flex flex-col items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-[var(--primary-blue)] ring-4 ring-[var(--bg-primary)]" />
                                            <div className="text-center absolute top-6 w-32 left-1/2 -translate-x-1/2">
                                                <p className="font-bold text-[var(--text-primary)]">{trackingResult.origin}</p>
                                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Origin</p>
                                            </div>
                                        </div>

                                        <div className="absolute top-1/2 right-0 -translate-y-1/2 flex flex-col items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-[var(--bg-tertiary)] ring-4 ring-[var(--bg-primary)]" />
                                            <div className="text-center absolute top-6 w-32 left-1/2 -translate-x-1/2">
                                                <p className="font-bold text-[var(--text-muted)]">{trackingResult.destination}</p>
                                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Destination</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="relative pl-8 space-y-0">
                                        <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-[var(--border-subtle)]" />
                                        {trackingResult.events.map((event, idx) => {
                                            const Icon = event.icon;
                                            return (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.15 }}
                                                    className="relative flex gap-8 pb-8 last:pb-0"
                                                >
                                                    <div className={cn(
                                                        "absolute -left-[45px] top-0 p-2.5 rounded-full border-[4px] border-[var(--bg-primary)] z-10 transition-all duration-500 shadow-sm",
                                                        event.done ? "bg-[var(--primary-blue)] text-white scale-110" : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                                                    )}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className={cn("flex-1 p-5 rounded-2xl border transition-all", event.done ? "bg-[var(--bg-secondary)]/30 border-[var(--border-subtle)]" : "bg-transparent border-transparent opacity-60")}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className={cn("font-bold text-lg", event.done ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>{event.status}</p>
                                                            {event.timestamp && <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">{event.timestamp.split(' ')[0]}</span>}
                                                        </div>
                                                        <p className="text-sm font-medium text-[var(--text-secondary)]">{event.location}</p>
                                                        {event.timestamp && <p className="text-xs text-[var(--text-muted)] mt-1">{event.timestamp.split(' ')[1]}</p>}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-[500px] p-8 rounded-[32px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-center relative overflow-hidden"
                            >
                                {/* Subtle concentric circles */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                                    <div className="w-[300px] h-[300px] border-[2px] border-[var(--text-primary)] rounded-full" />
                                    <div className="w-[500px] h-[500px] border-[2px] border-[var(--text-primary)] rounded-full absolute" />
                                </div>

                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10 rounded-full" />
                                    <div className="relative w-24 h-24 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center border border-[var(--border-subtle)]">
                                        <Truck className="h-10 w-10 text-[var(--text-muted)] opacity-50" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[var(--text-primary)]">Ready to Track</h3>
                                <p className="text-[var(--text-muted)] max-w-sm mt-3 font-medium">
                                    Enter an AWB number above to see the real-time journey of your package.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="p-6 rounded-[24px] bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[var(--bg-secondary)] rounded-xl">
                                <History className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                            <h3 className="font-bold text-[var(--text-primary)]">Recent Searches</h3>
                        </div>
                        <div className="space-y-3">
                            {recentTracking.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="group flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)]/30 hover:bg-[var(--bg-secondary)] transition-all cursor-pointer border border-transparent hover:border-[var(--border-subtle)]"
                                    onClick={() => {
                                        setAwbInput(item.awb);
                                        handleTrack();
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-blue)] opacity-40 group-hover:opacity-100 group-hover:shadow-[0_0_10px_var(--primary-blue)] transition-all" />
                                        <div>
                                            <p className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">{item.awb}</p>
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">{item.destination}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={
                                            item.status === 'delivered' ? 'success' :
                                                item.status === 'ndr' ? 'destructive' :
                                                    item.status === 'pending' ? 'warning' : 'neutral'
                                        } className="text-[10px] py-0.5 px-2 h-auto">
                                            {item.status}
                                        </Badge>
                                        <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{item.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
