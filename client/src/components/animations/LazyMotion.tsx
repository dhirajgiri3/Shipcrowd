"use client";

import dynamic from 'next/dynamic';

/**
 * Lazy-loaded Framer Motion Components
 * 
 * Framer Motion is ~200KB - we lazy load it for non-critical animations
 * Critical animations can still use direct imports
 */

// Lazy load motion component
export const LazyMotion = dynamic(
    () => import('framer-motion').then(mod => ({ default: mod.motion.div })),
    { ssr: false }
);

// Lazy load AnimatePresence
export const LazyAnimatePresence = dynamic(
    () => import('framer-motion').then(mod => ({ default: mod.AnimatePresence })),
    { ssr: false }
);

// For critical animations, export directly (these are needed immediately)
export { motion, AnimatePresence } from 'framer-motion';
