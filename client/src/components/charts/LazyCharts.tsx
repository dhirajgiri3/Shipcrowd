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

// Lazy load LineChart component
export const LazyLineChart = dynamic(
    () => import('recharts').then(mod => ({ default: mod.LineChart })),
    { loading: () => <ChartLoader />, ssr: false }
);

// Lazy load Line component
export const LazyLine = dynamic(
    () => import('recharts').then(mod => ({ default: mod.Line })),
    { ssr: false }
);

// Lazy load ComposedChart component
export const LazyComposedChart = dynamic(
    () => import('recharts').then(mod => ({ default: mod.ComposedChart })),
    { loading: () => <ChartLoader />, ssr: false }
);

// Lazy load XAxis component
export const LazyXAxis = dynamic(
    () => import('recharts').then(mod => ({ default: mod.XAxis })),
    { ssr: false }
);

// Lazy load YAxis component
export const LazyYAxis = dynamic(
    () => import('recharts').then(mod => ({ default: mod.YAxis })),
    { ssr: false }
);

// Lazy load CartesianGrid component
export const LazyCartesianGrid = dynamic(
    () => import('recharts').then(mod => ({ default: mod.CartesianGrid })),
    { ssr: false }
);

// Lazy load Tooltip component
export const LazyTooltip = dynamic(
    () => import('recharts').then(mod => ({ default: mod.Tooltip })),
    { ssr: false }
);

// Lazy load Legend component
export const LazyLegend = dynamic(
    () => import('recharts').then(mod => ({ default: mod.Legend })),
    { ssr: false }
);

// Lazy load Cell component
export const LazyCell = dynamic(
    () => import('recharts').then(mod => ({ default: mod.Cell })),
    { ssr: false }
);

// Lazy load ResponsiveContainer component
export const LazyResponsiveContainer = dynamic(
    () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
    { ssr: false }
);
