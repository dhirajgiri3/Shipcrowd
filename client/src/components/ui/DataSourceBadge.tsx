/**
 * Data Source Badge Component
 * 
 * Shows whether component is using real API data or mock data
 * Only visible in development, removed in production build
 */

import React from 'react';
import { Badge } from '@/src/components/ui/core/Badge';

interface DataSourceBadgeProps {
    isUsingMock: boolean;
    lastUpdated?: string;
}

export function DataSourceBadge({ isUsingMock, lastUpdated }: DataSourceBadgeProps) {
    // Only show in development
    if (process.env.NODE_ENV === 'production') {
        return null;
    }

    return (
        <div className="flex items-center gap-2 text-xs">
            {isUsingMock ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                    📊 Mock Data
                </Badge>
            ) : (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    ✓ Live Data
                </Badge>
            )}

            {lastUpdated && !isUsingMock && (
                <span className="text-gray-500">
                    Updated {formatDistanceToNow(new Date(lastUpdated))} ago
                </span>
            )}
        </div>
    );
}

function formatDistanceToNow(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}
