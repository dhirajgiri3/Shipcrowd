'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Truck,
    Building2,
    MapPin,
    CheckCircle,
    ChevronDown,
    Clock
} from 'lucide-react';

interface TimelineEvent {
    status: string;
    timestamp: string;
    location?: string;
    description?: string;
}

interface HorizontalTimelineProps {
    events: TimelineEvent[];
    currentStatus: string;
    className?: string;
}

interface TimelineStep {
    id: string;
    label: string;
    icon: React.ReactNode;
    status: 'completed' | 'current' | 'pending';
    timestamp?: string;
    location?: string;
}

const TIMELINE_STAGES = [
    { id: 'ORDER_CREATED', label: 'Order Created', icon: Package },
    { id: 'PICKED_UP', label: 'Picked Up', icon: Truck },
    { id: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
    { id: 'ARRIVED_AT_DESTINATION', label: 'At Hub', icon: Building2 },
    { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: MapPin },
    { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

export function HorizontalTimeline({
    events,
    currentStatus,
    className = '',
}: HorizontalTimelineProps) {
    const [expandedStep, setExpandedStep] = React.useState<string | null>(null);

    const timelineSteps = useMemo((): TimelineStep[] => {
        const normalizedCurrent = currentStatus.toUpperCase();
        const currentIndex = TIMELINE_STAGES.findIndex(s =>
            s.id === normalizedCurrent ||
            (normalizedCurrent === 'CREATED' && s.id === 'ORDER_CREATED')
        );

        return TIMELINE_STAGES.map((stage, index) => {
            const matchingEvent = events.find(e =>
                e.status.toUpperCase() === stage.id ||
                (e.status.toUpperCase() === 'CREATED' && stage.id === 'ORDER_CREATED')
            );

            let status: 'completed' | 'current' | 'pending';
            if (index < currentIndex) {
                status = 'completed';
            } else if (index === currentIndex) {
                status = 'current';
            } else {
                status = 'pending';
            }

            return {
                id: stage.id,
                label: stage.label,
                icon: <stage.icon className="w-4 h-4" strokeWidth={2} />,
                status,
                timestamp: matchingEvent?.timestamp,
                location: matchingEvent?.location,
            };
        });
    }, [events, currentStatus]);

    const formatTime = (timestamp?: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <motion.div
            className={`bg-[var(--bg-elevated)] rounded-[24px] p-6 md:p-8 border border-[var(--border-default)] ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-slate-800">
                    Shipment Journey
                </h3>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                    Step {timelineSteps.findIndex(s => s.status === 'current') + 1} of {timelineSteps.length}
                </span>
            </div>

            {/* --- DESKTOP VIEW (Horizontal) --- */}
            <div className="hidden md:block relative">
                {/* Background Line */}
                <div className="absolute top-5 left-0 right-0 h-1 bg-slate-100 rounded-full" />

                {/* Active Progress Line */}
                <motion.div
                    className="absolute top-5 left-0 h-1 bg-blue-600 rounded-full origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{
                        scaleX: (timelineSteps.findIndex(s => s.status === 'current') + 0.5) / (timelineSteps.length - 1)
                    }}
                    transition={{ duration: 1, delay: 0.5, ease: "circOut" }}
                />

                <div className="relative flex justify-between">
                    {timelineSteps.map((step, index) => (
                        <div key={step.id} className="flex flex-col items-center relative z-10">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2 + (index * 0.1) }}
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center border-4
                                    ${step.status === 'completed' ? 'bg-blue-600 border-white text-white' :
                                        step.status === 'current' ? 'bg-white border-blue-600 text-blue-600 shadow-lg' :
                                            'bg-slate-100 border-white text-slate-300'}
                                `}
                            >
                                {step.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : step.icon}
                            </motion.div>

                            <div className="mt-3 text-center">
                                <p className={`text-xs font-bold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
                                    {step.label}
                                </p>
                                {step.timestamp && (
                                    <p className="text-[10px] text-slate-500 mt-1">{formatTime(step.timestamp)}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- MOBILE VIEW (Vertical) --- */}
            <div className="md:hidden space-y-0 relative pl-4">
                {/* Vertical Line */}
                <div className="absolute top-2 bottom-6 left-[27px] w-0.5 bg-slate-100" />

                {/* Active Vertical Line - Calculate height based on current step */}
                <motion.div
                    className="absolute top-2 left-[27px] w-0.5 bg-blue-600 origin-top"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    style={{
                        height: `${(timelineSteps.findIndex(s => s.status === 'current') / (timelineSteps.length - 1)) * 100}%`
                    }}
                    transition={{ duration: 1.2, delay: 0.5, ease: "circOut" }}
                />

                {timelineSteps.map((step, index) => (
                    <div key={step.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
                        {/* Dot/Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1 + (index * 0.1) }}
                            className={`
                                relative z-10 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2
                                ${step.status === 'completed' ? 'bg-blue-600 border-blue-600 text-white' :
                                    step.status === 'current' ? 'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-50' :
                                        'bg-white border-slate-200 text-slate-300'}
                             `}
                        >
                            {step.status === 'completed' ? <CheckCircle className="w-3 h-3" /> :
                                step.status === 'current' ? <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" /> :
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        </motion.div>

                        {/* Content */}
                        <div className={`flex-1 pt-0.5 ${step.status === 'pending' ? 'opacity-50' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`text-sm font-bold ${step.status === 'current' ? 'text-blue-600' : 'text-slate-800'}`}>
                                        {step.label}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {step.location || (step.status === 'current' ? 'Processing...' : '')}
                                    </p>
                                </div>
                                {step.timestamp && (
                                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">
                                        {formatTime(step.timestamp).split(',')[0]}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </motion.div>
    );
}
