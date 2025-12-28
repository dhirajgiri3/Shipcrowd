'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Package } from 'lucide-react';

interface TimelineLocation {
    location?: string;
    timestamp: string;
}

interface Destination {
    city: string;
    state: string;
}

interface JourneyMapProps {
    locations: TimelineLocation[];
    destination: Destination;
    currentStatus: string;
    className?: string;
}

export function JourneyMap({
    locations,
    destination,
    currentStatus,
    className = '',
}: JourneyMapProps) {
    // Extract unique locations in order
    const journeyPoints = useMemo(() => {
        const unique = locations
            .filter(l => l.location)
            .map(l => l.location!)
            .filter((v, i, a) => a.indexOf(v) === i)
            .reverse(); // Oldest first

        return unique;
    }, [locations]);

    const isDelivered = currentStatus.toUpperCase() === 'DELIVERED';
    const progressPercent = useMemo(() => {
        const status = currentStatus.toUpperCase();
        if (status === 'DELIVERED') return 100;
        if (status === 'OUT_FOR_DELIVERY') return 90;
        if (status === 'ARRIVED_AT_DESTINATION') return 75;
        if (status === 'IN_TRANSIT') return 50;
        if (status === 'PICKED_UP') return 25;
        return 10;
    }, [currentStatus]);

    return (
        <motion.div
            className={`bg-[var(--bg-elevated)] rounded-2xl p-6 md:p-8 border border-[var(--border-default)] overflow-hidden relative ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
        >
            {/* Abstract Map Background */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Grid Pattern */}
                <svg className="w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="journey-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <path
                                d="M 30 0 L 0 0 0 30"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="0.5"
                                className="text-[var(--text-primary)]"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#journey-grid)" />
                </svg>

                {/* Decorative Circles */}
                <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-[var(--primary-blue)] opacity-[0.02]" />
                <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-[var(--primary-blue)] opacity-[0.02]" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary-blue)] text-white flex items-center justify-center">
                        <Navigation size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Journey Map</h3>
                        <p className="text-xs text-[var(--text-tertiary)]">
                            {journeyPoints.length} location{journeyPoints.length !== 1 ? 's' : ''} tracked
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                        Destination
                    </span>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                        {destination.city}, {destination.state}
                    </p>
                </div>
            </div>

            {/* Journey Visualization */}
            <div className="relative z-10 py-8">
                {/* Route Line Container */}
                <div className="relative h-20 flex items-center">
                    {/* Background Route Line */}
                    <div className="absolute left-4 right-4 h-1 bg-[var(--bg-tertiary)] rounded-full" />

                    {/* Active Route Line */}
                    <motion.div
                        className="absolute left-4 h-1 bg-[var(--primary-blue)] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `calc(${progressPercent}% - 32px)` }}
                        transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />

                    {/* Route Dashes (pending part) */}
                    <div
                        className="absolute h-1 border-t-2 border-dashed border-[var(--border-default)]"
                        style={{
                            left: `calc(${progressPercent}% - 16px)`,
                            right: '16px',
                            display: progressPercent >= 100 ? 'none' : 'block'
                        }}
                    />

                    {/* Origin Point */}
                    <motion.div
                        className="absolute left-0 flex flex-col items-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                    >
                        <div className="w-8 h-8 rounded-full bg-[var(--primary-blue)] text-white flex items-center justify-center shadow-lg">
                            <MapPin size={14} />
                        </div>
                        <span className="mt-2 text-[10px] font-medium text-[var(--text-secondary)] max-w-[70px] text-center truncate">
                            {journeyPoints[0] || 'Origin'}
                        </span>
                    </motion.div>

                    {/* Intermediate Points */}
                    {journeyPoints.slice(1, -1).map((point, index) => {
                        const position = ((index + 1) / (journeyPoints.length)) * 100;
                        const isPassed = position <= progressPercent;

                        return (
                            <motion.div
                                key={point}
                                className="absolute flex flex-col items-center"
                                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isPassed
                                        ? 'bg-[var(--primary-blue)] border-[var(--primary-blue)] text-white'
                                        : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)]'
                                    }`}>
                                    <div className="w-2 h-2 rounded-full bg-current" />
                                </div>
                                <span className="mt-2 text-[9px] text-[var(--text-tertiary)] max-w-[60px] text-center truncate">
                                    {point}
                                </span>
                            </motion.div>
                        );
                    })}

                    {/* Destination Point */}
                    <motion.div
                        className="absolute right-0 flex flex-col items-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${isDelivered
                                ? 'bg-[var(--success)] text-white'
                                : 'bg-[var(--bg-elevated)] border-2 border-[var(--border-strong)] text-[var(--text-secondary)]'
                            }`}>
                            <MapPin size={14} />
                        </div>
                        <span className="mt-2 text-[10px] font-medium text-[var(--text-secondary)] max-w-[70px] text-center truncate">
                            {destination.city}
                        </span>
                    </motion.div>

                    {/* Animated Package Marker */}
                    {!isDelivered && (
                        <motion.div
                            className="absolute z-20"
                            initial={{ left: '0%' }}
                            animate={{ left: `${Math.min(progressPercent, 95)}%` }}
                            transition={{ duration: 1.5, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                            style={{ transform: 'translateX(-50%)' }}
                        >
                            <motion.div
                                className="w-10 h-10 bg-[var(--primary-blue)] rounded-xl shadow-[var(--shadow-brand-sm)] flex items-center justify-center text-white"
                                animate={{ y: [-2, 2, -2] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <Package size={18} />
                            </motion.div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Footer Stats */}
            <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                <div>
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                        Origin
                    </span>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                        {journeyPoints[0] || 'Processing'}
                    </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)]">
                    <div className={`w-2 h-2 rounded-full ${isDelivered ? 'bg-[var(--success)]' : 'bg-[var(--primary-blue)] animate-pulse'
                        }`} />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                        {isDelivered ? 'Delivered' : 'In Progress'}
                    </span>
                </div>

                <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                        Progress
                    </span>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                        {progressPercent}%
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
