/**
 * PullToRefresh - Native-like pull-to-refresh gesture
 * Psychology: Familiar mobile pattern for content refresh
 * 
 * Usage:
 * <PullToRefresh onRefresh={async () => await fetchOrders()}>
 *   <OrderList orders={orders} />
 * </PullToRefresh>
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh: () => Promise<void>;
    pullThreshold?: number;
    className?: string;
}

export function PullToRefresh({
    children,
    onRefresh,
    pullThreshold = 80,
    className = ''
}: PullToRefreshProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [canPull, setCanPull] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const y = useMotionValue(0);

    // Transform pull distance to rotation
    const rotate = useTransform(y, [0, pullThreshold], [0, 360]);
    const opacity = useTransform(y, [0, pullThreshold], [0, 1]);

    // Check if user is at top of scroll container
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setCanPull(container.scrollTop === 0);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    const handleDragEnd = async (_: unknown, info: PanInfo) => {
        const offset = info.offset.y;

        if (offset > pullThreshold && canPull && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                y.set(0);
            }
        } else {
            y.set(0);
        }
    };

    return (
        <div ref={containerRef} className={`relative overflow-auto ${className}`}>
            {/* Pull indicator */}
            <motion.div
                style={{ opacity }}
                className="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-10"
            >
                <motion.div
                    style={{ rotate }}
                    className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg"
                >
                    <RefreshCw className={`w-6 h-6 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                </motion.div>
            </motion.div>

            {/* Draggable content */}
            <motion.div
                drag={canPull && !isRefreshing ? 'y' : false}
                dragConstraints={{ top: 0, bottom: pullThreshold * 1.5 }}
                dragElastic={0.3}
                onDragEnd={handleDragEnd}
                style={{ y }}
                className="touch-pan-y"
            >
                {children}
            </motion.div>
        </div>
    );
}
