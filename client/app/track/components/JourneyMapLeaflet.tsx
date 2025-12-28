'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { MapPin, Navigation, Package } from 'lucide-react';

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import('./MapView'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-[var(--bg-elevated)]">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] animate-pulse" />
                <p className="text-sm text-[var(--text-secondary)]">Loading map...</p>
            </div>
        </div>
    ),
});

interface TimelineEvent {
    status: string;
    timestamp: string;
    location?: string;
}

interface JourneyMapProps {
    locations: TimelineEvent[];
    destination: { city: string; state: string };
    currentStatus: string;
    className?: string;
}

// India major cities coordinates (for demo)
const CITY_COORDINATES: Record<string, [number, number]> = {
    'Delhi': [28.6139, 77.2090],
    'New Delhi': [28.6139, 77.2090],
    'Gurgaon': [28.4595, 77.0266],
    'Mumbai': [19.0760, 72.8777],
    'Bengaluru': [12.9716, 77.5946],
    'Chennai': [13.0827, 80.2707],
    'Hyderabad': [17.3850, 78.4867],
    'Kolkata': [22.5726, 88.3639],
    'Pune': [18.5204, 73.8567],
    'Ahmedabad': [23.0225, 72.5714],
    'Jaipur': [26.9124, 75.7873],
    'Chandigarh': [30.7333, 76.7794],
    'Kochi': [9.9312, 76.2673],
    // Specific locations for Dev Panchal Mock
    'Udyog Vihar': [28.5020, 77.0870],
    'Gurgaon Regional Hub': [28.4278, 76.9926], // Sector 37
    'NH-48': [28.5360, 77.1080], // Highway point
    'IGI Airport': [28.5562, 77.1000],
    'Nehru Place': [28.5492, 77.2526],
};

export function JourneyMapLeaflet({
    locations,
    destination,
    currentStatus,
    className = '',
}: JourneyMapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Extract coordinates from locations
    const coordinates = locations
        .map((loc) => {
            if (!loc.location) return null;

            // Try to find city in location string
            for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
                if (loc.location.includes(city)) {
                    return {
                        coords,
                        location: loc.location,
                        status: loc.status,
                        timestamp: loc.timestamp,
                    };
                }
            }
            return null;
        })
        .filter(Boolean);

    const origin = coordinates[coordinates.length - 1]?.coords || [28.6139, 77.2090];
    const dest = CITY_COORDINATES[destination.city] || CITY_COORDINATES['Gurgaon'] || [28.4595, 77.0266];
    const current = coordinates[0]?.coords || origin;

    if (!mounted) {
        return (
            <div className={`bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-default)] overflow-hidden ${className}`}>
                <div className="w-full h-[400px] flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className={`bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-default)] overflow-hidden ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
        >
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-[var(--primary-blue)]" />
                        Journey Route
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Live tracking</span>
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="relative h-[400px] w-full">
                <MapComponent
                    origin={origin}
                    destination={dest}
                    currentLocation={current}
                    waypoints={coordinates.map(c => c!.coords)}
                />

                {/* Weather Widget Overlay */}
                <div className="absolute top-4 right-4 z-[400]">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 }}
                        className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-white/50 flex items-center gap-3"
                    >
                        <div className="text-2xl">☀️</div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination</p>
                            <p className="text-sm font-semibold text-slate-800">New Delhi, 32°C</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Route Info */}
            <div className="p-4 md:p-6 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-tertiary)] mb-0.5">Origin</p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                {locations[locations.length - 1]?.location?.split(',')[0] || 'New Delhi'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-[var(--primary-blue)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-tertiary)] mb-0.5">Destination</p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                {destination.city}, {destination.state}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
