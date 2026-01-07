"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/**
 * Lazy-loaded Chart Components
 * 
 * Recharts is ~800KB - we lazy load it to reduce initial bundle size
 * Only loads when charts are actually rendered on screen
 */

// Loading fallback component
const ChartLoader = () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)] rounded-lg">
        <Loader2 className="w-8 h-8 text-[var(--primary-blue)] animate-spin" />
    </div>
);

// Lazy load AreaChart component
export const LazyAreaChart = dynamic(
    () => import('recharts').then(mod => ({ default: mod.AreaChart })),
    {
        loading: () => <ChartLoader />,
        ssr: false, // Charts don't need SSR
    }
);

// Lazy load Area component
export const LazyArea = dynamic(
    () => import('recharts').then(mod => ({ default: mod.Area })),
    { ssr: false }
);

// Lazy load PieChart component
export const LazyPieChart = dynamic(
    () => import('recharts').then(mod => ({ default: mod.PieChart })),
    {
        loading: () => <ChartLoader />,
        ssr: false,
    }
);

// Lazy load Pie component
export const LazyPie = dynamic(
    () => import('recharts').then(mod => ({ default: mod.Pie })),
    { ssr: false }
);

// Lazy load BarChart component
export const LazyBarChart = dynamic(
    () => import('recharts').then(mod => ({ default: mod.BarChart })),
    {
        loading: () => <ChartLoader />,
        ssr: false,
    }
);

// Lazy load Bar component
export const LazyBar = dynamic(
    () => import('recharts').then(mod => ({ default: mod.Bar })),
    { ssr: false }
);

// Export other chart components (lightweight, can be direct imports)
export { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
