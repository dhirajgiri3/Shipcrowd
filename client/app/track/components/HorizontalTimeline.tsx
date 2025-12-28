'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Truck,
    Building2,
    MapPin,
    CheckCircle,
    ChevronDown
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
            className={`bg-[var(--bg-elevated)] rounded-2xl p-6 md:p-8 border border-[var(--border-default)] ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Shipment Journey
                </h3>
                <span className="text-xs text-[var(--text-tertiary)]">
                    {timelineSteps.filter(s => s.status === 'completed').length + (timelineSteps.some(s => s.status === 'current') ? 1 : 0)} of {timelineSteps.length} steps
                </span>
            </div>

            {/* Horizontal Timeline */}
            <div className="relative">
                {/* Progress Line Background */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-[var(--bg-tertiary)]" />

                {/* Progress Line Active */}
                <motion.div
                    className="absolute top-5 left-0 h-0.5 bg-[var(--primary-blue)]"
                    initial={{ width: 0 }}
                    animate={{
                        width: `${((timelineSteps.findIndex(s => s.status === 'current') + 1) / timelineSteps.length) * 100}%`
                    }}
                    transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                />

                {/* Steps */}
                <div className="relative flex justify-between">
                    {timelineSteps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            className="flex flex-col items-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.1, duration: 0.3 }}
                        >
                            {/* Step Circle */}
                            <motion.button
                                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                                className={`
                  relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-200 cursor-pointer
                  ${step.status === 'completed'
                                        ? 'bg-[var(--primary-blue)] text-white'
                                        : step.status === 'current'
                                            ? 'bg-[var(--primary-blue)] text-white ring-4 ring-[var(--primary-blue-soft)]'
                                            : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-2 border-[var(--border-default)]'
                                    }
                `}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {step.status === 'completed' ? (
                                    <CheckCircle className="w-5 h-5" strokeWidth={2.5} />
                                ) : (
                                    step.icon
                                )}

                                {/* Current Step Pulse */}
                                {step.status === 'current' && (
                                    <motion.div
                                        className="absolute inset-0 rounded-full bg-[var(--primary-blue)]"
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                )}
                            </motion.button>

                            {/* Step Label */}
                            <div className="mt-3 text-center max-w-[80px]">
                                <span className={`text-[10px] md:text-xs font-medium block ${step.status === 'pending'
                                        ? 'text-[var(--text-muted)]'
                                        : 'text-[var(--text-secondary)]'
                                    }`}>
                                    {step.label}
                                </span>

                                {step.timestamp && step.status !== 'pending' && (
                                    <span className="text-[9px] text-[var(--text-tertiary)] block mt-0.5">
                                        {formatTime(step.timestamp)}
                                    </span>
                                )}
                            </div>

                            {/* Expand Indicator */}
                            {step.location && (
                                <motion.div
                                    className={`mt-1 ${expandedStep === step.id ? 'rotate-180' : ''}`}
                                    animate={{ rotate: expandedStep === step.id ? 180 : 0 }}
                                >
                                    <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Expanded Details */}
            {expandedStep && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 pt-4 border-t border-[var(--border-subtle)]"
                >
                    {(() => {
                        const step = timelineSteps.find(s => s.id === expandedStep);
                        const event = events.find(e =>
                            e.status.toUpperCase() === expandedStep ||
                            (e.status.toUpperCase() === 'CREATED' && expandedStep === 'ORDER_CREATED')
                        );

                        if (!step || !event) return null;

                        return (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)]">
                                    {step.icon}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                        {step.label}
                                    </p>
                                    {event.location && (
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                            📍 {event.location}
                                        </p>
                                    )}
                                    {event.description && (
                                        <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                            {event.description}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                        {formatTime(event.timestamp)}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </motion.div>
            )}
        </motion.div>
    );
}
