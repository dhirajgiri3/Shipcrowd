'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { generateArt } from '../utils/generativeArt';

interface GenerativeArtProps {
  trackingNumber: string;
  deliveryData?: {
    distance?: number;
    timeElapsed?: number;
    status?: string;
  };
  className?: string;
}

export function GenerativeArt({ trackingNumber, deliveryData, className = '' }: GenerativeArtProps) {
  const art = useMemo(
    () => generateArt(trackingNumber, deliveryData),
    [trackingNumber, deliveryData]
  );

  return (
    <motion.svg
      viewBox="0 0 400 300"
      className={`absolute inset-0 w-full h-full ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      aria-hidden="true"
    >
      <defs>
        {/* Gradient definitions for shapes */}
        <linearGradient id={`gradient-${art.seed}`} x1="0%" y1="0%" x2="100%" y2="100%">
          {art.colors.map((color, i) => (
            <stop
              key={i}
              offset={`${(i / (art.colors.length - 1)) * 100}%`}
              stopColor={color}
              stopOpacity={0.6}
            />
          ))}
        </linearGradient>

        {/* Blur filter for soft edges */}
        <filter id={`blur-${art.seed}`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      {/* Background gradient */}
      <rect
        width="400"
        height="300"
        fill={`url(#gradient-${art.seed})`}
        opacity="0.05"
      />

      {/* Render generated shapes */}
      {art.shapes.map((shape, index) => {
        const delay = index * 0.05;

        if (shape.type === 'circle') {
          return (
            <motion.circle
              key={index}
              cx={shape.x}
              cy={shape.y}
              r={shape.radius}
              fill={shape.color}
              opacity={shape.opacity}
              filter={`url(#blur-${art.seed})`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: shape.opacity }}
              transition={{
                duration: 1.5,
                delay,
                type: 'spring',
                stiffness: 100,
                damping: 20,
              }}
            />
          );
        }

        if (shape.type === 'rect') {
          return (
            <motion.rect
              key={index}
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              fill={shape.color}
              opacity={shape.opacity}
              filter={`url(#blur-${art.seed})`}
              rx="8"
              initial={{ scale: 0, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: shape.opacity }}
              transition={{
                duration: 1.5,
                delay,
                type: 'spring',
                stiffness: 120,
                damping: 25,
              }}
            />
          );
        }

        if (shape.type === 'path') {
          return (
            <motion.path
              key={index}
              d={shape.path}
              fill={art.pattern === 'lines' ? 'none' : shape.color}
              stroke={art.pattern === 'lines' || art.pattern === 'waves' ? shape.color : 'none'}
              strokeWidth={art.pattern === 'lines' ? '2' : '3'}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={shape.opacity}
              filter={`url(#blur-${art.seed})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: shape.opacity }}
              transition={{
                duration: 2,
                delay,
                ease: 'easeInOut',
              }}
            />
          );
        }

        return null;
      })}

      {/* Overlay pattern based on art type */}
      {art.pattern === 'organic' && (
        <motion.circle
          cx="200"
          cy="150"
          r="120"
          fill="none"
          stroke={art.colors[0]}
          strokeWidth="1"
          opacity="0.1"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 2, delay: 0.5 }}
        />
      )}
    </motion.svg>
  );
}
