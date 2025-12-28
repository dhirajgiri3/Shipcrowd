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
      className={`bg-[var(--bg-elevated)] rounded-3xl p-6 md:p-8 border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] overflow-hidden relative min-h-[300px] md:h-[350px] ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 25,
        delay: 0.5,
      }}
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
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-blue)] text-white flex items-center justify-center">
            <Navigation size={18} />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">Journey Map</h3>
            <p className="text-xs md:text-sm text-[var(--text-tertiary)]">{uniqueLocations.length} stop{uniqueLocations.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="text-left md:text-right">
          <div className="text-xs text-[var(--text-tertiary)]">Destination</div>
          <div className="font-bold text-sm md:text-base text-[var(--text-primary)]">
            {destination.city}, {destination.state}
          </div>
        </div>
      </div>

      {/* Route Visualization */}
      <div className="relative z-10 flex items-center justify-around min-h-[180px] md:h-[220px]">
        {uniqueLocations.map((location, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.15 }}
          >
            {/* Location Pin */}
            <motion.div
              className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 ${i === 0
                ? 'bg-[var(--primary-blue)] text-white border-[var(--primary-blue)]'
                : i === uniqueLocations.length - 1
                  ? 'bg-[var(--success)] text-white border-[var(--success)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--primary-blue)] border-[var(--border-default)]'
                }`}
              animate={{
                scale: i === 0 ? [1, 1.05, 1] : i === uniqueLocations.length - 1 ? [1, 1.05, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: i === 0 || i === uniqueLocations.length - 1 ? Infinity : 0,
                ease: 'easeInOut',
              }}
            >
              <MapPin size={i === 0 || i === uniqueLocations.length - 1 ? 22 : 18} />
            </motion.div>

            {/* Location Label */}
            <div className="mt-3 text-center max-w-[80px] md:max-w-[120px]">
              <div className="text-[10px] md:text-xs font-bold text-[var(--text-secondary)] truncate">
                {location}
              </div>
              <div className="text-[9px] md:text-[10px] text-[var(--text-tertiary)] mt-1 font-medium">
                {i === 0 ? 'Origin' : i === uniqueLocations.length - 1 ? 'Current' : `Stop ${i}`}
              </div>
            </div>

            {/* Connecting Line */}
            {i < uniqueLocations.length - 1 && (
              <motion.div
                className="absolute top-6 md:top-8 h-0.5 bg-[var(--primary-blue)]"
                style={{
                  left: `${((i + 0.5) / uniqueLocations.length) * 100}%`,
                  width: `${100 / uniqueLocations.length}%`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.9 + i * 0.15, duration: 0.5 }}
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
