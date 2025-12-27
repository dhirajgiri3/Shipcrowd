'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';

interface Location {
  city: string;
  state: string;
}

interface InteractiveMapProps {
  locations: Array<{ location?: string; timestamp: string }>;
  destination: Location;
  className?: string;
}

export function InteractiveMap({ locations, destination, className = '' }: InteractiveMapProps) {
  // Extract unique locations
  const uniqueLocations = locations
    .filter(l => l.location)
    .map(l => l.location!)
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <motion.div
      className={`bg-gradient-to-br from-[var(--primary-blue-soft)]/50 to-[var(--bg-secondary)] rounded-[32px] p-8 border border-[var(--primary-blue-soft)] shadow-[var(--shadow-brand-sm)] overflow-hidden relative h-[400px] ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 25,
        delay: 0.6,
      }}
      data-cursor="map"
    >
      {/* Abstract Map Background */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-[var(--primary-blue-soft)]"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
        </svg>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-blue)] text-white flex items-center justify-center shadow-[var(--shadow-brand)]">
            <Navigation size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Journey Map</h3>
            <p className="text-sm text-[var(--text-tertiary)]">{uniqueLocations.length} stops</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-[var(--text-tertiary)]">Destination</div>
          <div className="font-bold text-[var(--text-primary)]">
            {destination.city}, {destination.state}
          </div>
        </div>
      </div>

      {/* Route Visualization */}
      <div className="relative z-10 flex items-center justify-around h-[250px]">
        {uniqueLocations.map((location, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.2 }}
          >
            {/* Location Pin */}
            <motion.div
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[var(--shadow-lg)] ${i === 0
                  ? 'bg-[var(--primary-blue)] text-white shadow-[var(--shadow-brand)]'
                  : i === uniqueLocations.length - 1
                    ? 'bg-[var(--success)] text-white shadow-[0_0_20px_var(--success-bg)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--primary-blue)] border-2 border-[var(--primary-blue-soft)]'
                }`}
              animate={{
                scale: i === uniqueLocations.length - 1 ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: i === uniqueLocations.length - 1 ? Infinity : 0,
                ease: 'easeInOut',
              }}
            >
              <MapPin size={24} />
            </motion.div>

            {/* Location Label */}
            <div className="mt-3 text-center">
              <div className="text-xs font-bold text-[var(--text-secondary)] max-w-[100px] truncate">
                {location}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-1">
                {i === 0 ? 'Origin' : i === uniqueLocations.length - 1 ? 'Current' : `Stop ${i}`}
              </div>
            </div>

            {/* Connecting Line */}
            {i < uniqueLocations.length - 1 && (
              <motion.div
                className="absolute top-8 h-0.5 bg-[var(--primary-blue-soft)]"
                style={{
                  left: `${((i + 0.5) / uniqueLocations.length) * 100}%`,
                  width: `${100 / uniqueLocations.length}%`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1 + i * 0.2, duration: 0.5 }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Animated Package Icon */}
      <motion.div
        className="absolute z-20"
        initial={{ left: '10%', top: '45%' }}
        animate={{
          left: ['10%', '90%'],
          top: ['45%', '45%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
          repeatDelay: 2,
        }}
      >
        <div className="w-8 h-8 bg-[var(--primary-blue)] rounded-lg shadow-[var(--shadow-brand)] flex items-center justify-center text-white">
          📦
        </div>
      </motion.div>
    </motion.div>
  );
}
