/**
 * GeographicInsights - PREMIUM Geographic Performance Dashboard
 * 
 * REDESIGNED with stunning visuals:
 * - Top 5 cities with animated counters & gradient cards
 * - 3D donut chart with glow effects & interactive tooltips
 * - Pulse-animated India map with gradient regions
 * - Glassmorphism design language
 * - Micro-interactions on every element
 * - Staggered entrance animations
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, TrendingUp, TrendingDown, Package, Map } from 'lucide-react';
import { useIsMobile } from '@/src/hooks/ux';

// ============================================================================
// Types
// ============================================================================

interface CityMetric {
  city: string;
  state: string;
  orders: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface RegionMetric {
  region: 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Central';
  orders: number;
  percentage: number;
  color: string;
}

interface GeographicInsightsProps {
  topCities: CityMetric[];
  regions: RegionMetric[];
  totalOrders: number;
}
// ============================================================================
// Region Colors (User Requested Palette)
// ============================================================================

const REGION_COLORS: Record<string, string> = {
  North: '#6366F1',      // Violet/Purple
  South: '#EF4444',      // Red
  East: '#EAB308',       // Yellow
  West: '#E5E7EB',       // Light Gray
  Northeast: '#D1D5DB',  // Light Gray (darker shade)
  Central: '#9CA3AF'     // Light Gray (darker shade)
};

// ============================================================================
// Premium 3D Donut Chart with Enhanced Interactivity
// ============================================================================

interface DonutChartProps {
  data: RegionMetric[];
  size?: number;
  strokeWidth?: number;
}

function PremiumDonutChart({ data, size = 260, strokeWidth = 40 }: DonutChartProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [totalOrders, setTotalOrders] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animate total orders counter
  React.useEffect(() => {
    const total = data.reduce((sum, r) => sum + r.orders, 0);
    let current = 0;
    const increment = total / 30; // 30 frames
    const timer = setInterval(() => {
      current += increment;
      if (current >= total) {
        setTotalOrders(total);
        clearInterval(timer);
      } else {
        setTotalOrders(Math.floor(current));
      }
    }, 20);
    return () => clearInterval(timer);
  }, [data]);

  let cumulativePercentage = 0;

  return (
    <div className="relative group">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-blue)]/5 via-transparent to-[var(--primary-blue)]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10 transform -rotate-90 drop-shadow-lg">
        {/* Outer shadow ring */}
        <circle
          cx={center}
          cy={center}
          r={radius + 3}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth + 6}
          opacity="0.05"
        />

        {/* Data segments with enhanced visuals */}
        {data.map((region, index) => {
          const segmentPercentage = region.percentage;
          const segmentLength = (segmentPercentage / 100) * circumference;
          const offset = ((100 - cumulativePercentage) / 100) * circumference;
          const isHovered = hoveredRegion === region.region;

          // Calculate midpoint for percentage label
          const midAngle = ((cumulativePercentage + segmentPercentage / 2) / 100) * 2 * Math.PI - Math.PI / 2;
          const labelRadius = radius + strokeWidth / 2;
          const labelX = center + labelRadius * Math.cos(midAngle);
          const labelY = center + labelRadius * Math.sin(midAngle);

          const segment = (
            <g key={region.region}>
              {/* Glow effect for hovered segment */}
              <AnimatePresence>
                {isHovered && (
                  <motion.circle
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={region.color}
                    strokeWidth={strokeWidth + 12}
                    strokeDasharray={`${segmentLength} ${circumference}`}
                    strokeDashoffset={offset}
                    filter="url(#glow)"
                    className="animate-pulse"
                  />
                )}
              </AnimatePresence>

              {/* Main segment with smooth transitions */}
              <motion.circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={region.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segmentLength} ${circumference}`}
                strokeDashoffset={offset}
                initial={{ strokeDashoffset: circumference, opacity: 0 }}
                animate={{
                  strokeDashoffset: offset,
                  opacity: isHovered ? 1 : 0.9,
                  strokeWidth: isHovered ? strokeWidth + 2 : strokeWidth
                }}
                transition={{
                  strokeDashoffset: { delay: index * 0.15, duration: 1, ease: 'easeOut' },
                  opacity: { duration: 0.2 },
                  strokeWidth: { duration: 0.2 }
                }}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredRegion(region.region)}
                onMouseLeave={() => setHoveredRegion(null)}
                strokeLinecap="round"
                style={{
                  filter: isHovered ? 'drop-shadow(0 0 12px currentColor)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}
              />

              {/* Percentage label on segment (only show if segment is large enough) */}
              {segmentPercentage > 8 && (
                <motion.text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-bold fill-white pointer-events-none transform rotate-90"
                  style={{ transformOrigin: `${labelX}px ${labelY}px` }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: isHovered ? 1 : 0.8, scale: isHovered ? 1.2 : 1 }}
                  transition={{ delay: index * 0.15 + 0.5, duration: 0.3 }}
                >
                  {region.percentage}%
                </motion.text>
              )}
            </g>
          );

          cumulativePercentage += segmentPercentage;
          return segment;
        })}

        {/* Glow filter definition */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Center content with animated counter */}
        <g className="transform rotate-90" style={{ transformOrigin: 'center' }}>
          {/* Background circle for center */}
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 2 - 10}
            fill="var(--bg-secondary)"
            opacity="0.5"
          />

          <text
            x={center}
            y={center - 15}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-4xl font-bold fill-[var(--text-primary)]"
          >
            {totalOrders.toLocaleString()}
          </text>
          <text
            x={center}
            y={center + 18}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm fill-[var(--text-secondary)] uppercase tracking-wider font-medium"
          >
            orders
          </text>

          {/* Show hovered region name in center */}
          {hoveredRegion && (
            <motion.text
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              x={center}
              y={center + 35}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-[var(--primary-blue)] font-bold"
            >
              {hoveredRegion}
            </motion.text>
          )}
        </g>
      </svg>

      {/* Floating tooltip with region details */}
      <AnimatePresence>
        {hoveredRegion && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute -top-20 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-2xl z-20 min-w-[140px]"
          >
            <div className="text-center">
              <div className="text-sm font-bold text-[var(--text-primary)] mb-1">
                {hoveredRegion}
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="text-lg font-bold text-[var(--primary-blue)]">
                  {data.find(r => r.region === hoveredRegion)?.orders}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  orders
                </div>
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">
                {data.find(r => r.region === hoveredRegion)?.percentage}% of total
              </div>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--bg-primary)] border-r border-b border-[var(--border-default)] transform rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Animated Pulse India Map
// ============================================================================

interface PulseMapProps {
  regions: RegionMetric[];
}

function AnimatedPulseMap({ regions }: PulseMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const getRegionData = (regionName: string) =>
    regions.find(r => r.region === regionName);

  const getIntensity = (orders: number) => {
    const maxOrders = Math.max(1, ...regions.map(r => r.orders));
    return 0.4 + (orders / maxOrders) * 0.6;
  };

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 300 420" className="w-full h-full drop-shadow-2xl">
        <defs>
          {/* Gradient definitions for each region */}
          {regions.map(region => (
            <linearGradient key={`grad-${region.region}`} id={`gradient-${region.region}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={region.color} stopOpacity={getIntensity(region.orders)} />
              <stop offset="100%" stopColor={region.color} stopOpacity={getIntensity(region.orders) * 0.7} />
            </linearGradient>
          ))}

          {/* Glow filter */}
          <filter id="regionGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* North */}
        <motion.path
          d="M 100 40 L 200 40 L 220 100 L 180 120 L 120 120 L 80 100 Z"
          fill={`url(#gradient-North)`}
          stroke={hoveredRegion === 'North' ? getRegionData('North')?.color : 'var(--border-default)'}
          strokeWidth={hoveredRegion === 'North' ? '3' : '2'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: hoveredRegion === 'North' ? 1.05 : 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="cursor-pointer transition-all"
          onMouseEnter={() => setHoveredRegion('North')}
          onMouseLeave={() => setHoveredRegion(null)}
          filter={hoveredRegion === 'North' ? 'url(#regionGlow)' : 'none'}
        />

        {/* Northeast */}
        <motion.path
          d="M 220 80 L 260 90 L 250 130 L 220 120 Z"
          fill={`url(#gradient-Northeast)`}
          stroke={hoveredRegion === 'Northeast' ? getRegionData('Northeast')?.color : 'var(--border-default)'}
          strokeWidth={hoveredRegion === 'Northeast' ? '3' : '2'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: hoveredRegion === 'Northeast' ? 1.05 : 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="cursor-pointer transition-all"
          onMouseEnter={() => setHoveredRegion('Northeast')}
          onMouseLeave={() => setHoveredRegion(null)}
          filter={hoveredRegion === 'Northeast' ? 'url(#regionGlow)' : 'none'}
        />

        {/* Central */}
        <motion.path
          d="M 120 120 L 180 120 L 190 200 L 110 200 Z"
          fill={`url(#gradient-Central)`}
          stroke={hoveredRegion === 'Central' ? getRegionData('Central')?.color : 'var(--border-default)'}
          strokeWidth={hoveredRegion === 'Central' ? '3' : '2'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: hoveredRegion === 'Central' ? 1.05 : 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="cursor-pointer transition-all"
          onMouseEnter={() => setHoveredRegion('Central')}
          onMouseLeave={() => setHoveredRegion(null)}
          filter={hoveredRegion === 'Central' ? 'url(#regionGlow)' : 'none'}
        />

        {/* West */}
        <motion.path
          d="M 50 140 L 110 130 L 110 230 L 60 240 Z"
          fill={`url(#gradient-West)`}
          stroke={hoveredRegion === 'West' ? getRegionData('West')?.color : 'var(--border-default)'}
          strokeWidth={hoveredRegion === 'West' ? '3' : '2'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: hoveredRegion === 'West' ? 1.05 : 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="cursor-pointer transition-all"
          onMouseEnter={() => setHoveredRegion('West')}
          onMouseLeave={() => setHoveredRegion(null)}
          filter={hoveredRegion === 'West' ? 'url(#regionGlow)' : 'none'}
        />

        {/* East */}
        <motion.path
          d="M 190 140 L 240 150 L 235 240 L 190 230 Z"
          fill={`url(#gradient-East)`}
          stroke={hoveredRegion === 'East' ? getRegionData('East')?.color : 'var(--border-default)'}
          strokeWidth={hoveredRegion === 'East' ? '3' : '2'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: hoveredRegion === 'East' ? 1.05 : 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="cursor-pointer transition-all"
          onMouseEnter={() => setHoveredRegion('East')}
          onMouseLeave={() => setHoveredRegion(null)}
          filter={hoveredRegion === 'East' ? 'url(#regionGlow)' : 'none'}
        />

        {/* South */}
        <motion.path
          d="M 90 240 L 210 240 L 190 320 L 150 360 L 110 320 Z"
          fill={`url(#gradient-South)`}
          stroke={hoveredRegion === 'South' ? getRegionData('South')?.color : 'var(--border-default)'}
          strokeWidth={hoveredRegion === 'South' ? '3' : '2'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: hoveredRegion === 'South' ? 1.05 : 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="cursor-pointer transition-all"
          onMouseEnter={() => setHoveredRegion('South')}
          onMouseLeave={() => setHoveredRegion(null)}
          filter={hoveredRegion === 'South' ? 'url(#regionGlow)' : 'none'}
        />

        {/* Region labels with subtle animation */}
        <motion.text initial={{ opacity: 0.6 }} x="150" y="80" textAnchor="middle" className="text-xs fill-[var(--text-primary)] font-bold pointer-events-none" animate={{ opacity: hoveredRegion === 'North' ? 1 : 0.6 }}>N</motion.text>
        <motion.text initial={{ opacity: 0.6 }} x="240" y="110" textAnchor="middle" className="text-xs fill-[var(--text-primary)] font-bold pointer-events-none" animate={{ opacity: hoveredRegion === 'Northeast' ? 1 : 0.6 }}>NE</motion.text>
        <motion.text initial={{ opacity: 0.6 }} x="150" y="160" textAnchor="middle" className="text-xs fill-[var(--text-primary)] font-bold pointer-events-none" animate={{ opacity: hoveredRegion === 'Central' ? 1 : 0.6 }}>C</motion.text>
        <motion.text initial={{ opacity: 0.6 }} x="80" y="185" textAnchor="middle" className="text-xs fill-[var(--text-primary)] font-bold pointer-events-none" animate={{ opacity: hoveredRegion === 'West' ? 1 : 0.6 }}>W</motion.text>
        <motion.text initial={{ opacity: 0.6 }} x="215" y="195" textAnchor="middle" className="text-xs fill-[var(--text-primary)] font-bold pointer-events-none" animate={{ opacity: hoveredRegion === 'East' ? 1 : 0.6 }}>E</motion.text>
        <motion.text initial={{ opacity: 0.6 }} x="150" y="290" textAnchor="middle" className="text-xs fill-[var(--text-primary)] font-bold pointer-events-none" animate={{ opacity: hoveredRegion === 'South' ? 1 : 0.6 }}>S</motion.text>
      </svg>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GeographicInsights({
  topCities,
  regions,
  totalOrders
}: GeographicInsightsProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  // ============================================================================
  // Region Colors (User Requested Palette)
  // ============================================================================

  const top5Cities = topCities.slice(0, 5);

  // Rank colors gradient
  const getRankGradient = (index: number) => {
    const gradients = [
      'from-amber-500/20 to-amber-600/10',  // Gold
      'from-slate-400/20 to-slate-500/10',   // Silver
      'from-orange-600/20 to-orange-700/10', // Bronze
      'from-blue-500/20 to-blue-600/10',     // 4th
      'from-purple-500/20 to-purple-600/10', // 5th
    ];
    return gradients[index] || 'from-gray-500/20 to-gray-600/10';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Premium Header with Sparkles */}
      <div className="flex items-center justify-between px-1">
        <motion.div
          className="flex items-center gap-3"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-blue)] to-transparent rounded-xl blur-lg opacity-50" />
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-[var(--primary-blue)]/20 to-[var(--primary-blue)]/10 border border-[var(--primary-blue)]/30">
              <Map className="w-6 h-6 text-[var(--primary-blue)]" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Geographic Performance
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Visual breakdown of shipping destinations
            </p>
          </div>
        </motion.div>

        <motion.div
          className="px-4 py-2 rounded-xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-subtle)] backdrop-blur-sm"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[var(--primary-blue)]" />
            <span className="text-sm font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--primary-blue)] bg-clip-text text-transparent">
              {totalOrders.toLocaleString()}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">orders</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP 5 CITIES - Premium Cards */}
        <motion.div
          className="space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Top 5 Cities
            </h3>
            <span className="text-xs text-[var(--text-tertiary)]">By order volume</span>
          </div>

          <div className="space-y-3 flex-1">
            {top5Cities.map((city, index) => (
              <motion.div
                key={city.city}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.08 }}
                whileHover={{ scale: 1.02, x: 4 }}
                className="group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] p-4 cursor-pointer transition-colors"
              >

                <div className="relative z-10 flex items-center gap-4">
                  {/* Rank badge */}
                  <motion.div
                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-blue)]/20 to-[var(--primary-blue)]/10 border border-[var(--primary-blue)]/20 flex items-center justify-center"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-lg font-bold text-[var(--primary-blue)]">
                      {index + 1}
                    </span>
                  </motion.div>

                  {/* City info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-[var(--primary-blue)] flex-shrink-0" />
                      <h4 className="text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--primary-blue)] transition-colors">
                        {city.city}
                      </h4>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{city.state}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <motion.div
                        className="text-xl font-bold text-[var(--text-primary)]"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.08, type: 'spring' }}
                      >
                        {city.orders}
                      </motion.div>
                      <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                        {city.percentage}%
                      </div>
                    </div>

                    {/* Trend indicator */}
                    {city.trend !== 'stable' && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.6 + index * 0.08, type: 'spring' }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg ${city.trend === 'up'
                          ? 'bg-emerald-500/20 border border-emerald-500/30'
                          : 'bg-red-500/20 border border-red-500/30'
                          }`}
                      >
                        {city.trend === 'up' ? (
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        )}
                        <span className={`text-xs font-bold ${city.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                          {city.trendValue}%
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* REGIONAL DISTRIBUTION - Premium Visualization */}
        <motion.div
          className="space-y-4 h-full flex flex-col"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Regional Distribution
            </h3>
            <span className="text-xs text-[var(--text-tertiary)]">Interactive map</span>
          </div>

          {/* Map + Donut Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* India Map */}
            <motion.div
              className="relative aspect-[3/4] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <AnimatedPulseMap regions={regions} />
            </motion.div>

            {/* 3D Donut Chart */}
            <motion.div
              className="relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-6 flex items-center justify-center overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <PremiumDonutChart data={regions} />
            </motion.div>
          </div>

          {/* Premium Legend */}
          <motion.div
            className="grid grid-cols-2 gap-3 p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {regions.map((region, index) => (
              <motion.div
                key={region.region}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.75 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer group"
              >
                <div
                  className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] group-hover:ring-4 transition-all"
                  style={{
                    backgroundColor: region.color,
                    ['--tw-ring-color' as any]: `${region.color}40`
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {region.region}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    {region.orders} ({region.percentage}%)
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
