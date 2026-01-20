/**
 * SwipeableCard - Touch-optimized card with swipe actions
 * Psychology: Gesture-based interactions feel natural on mobile
 * 
 * Usage:
 * <SwipeableCard
 *   onSwipeLeft={() => trackOrder(order.id)}
 *   onSwipeRight={() => callCustomer(order.phone)}
 *   leftAction={{ icon: <MapPin />, label: 'Track', color: 'blue' }}
 *   rightAction={{ icon: <Phone />, label: 'Call', color: 'green' }}
 * >
 *   <OrderCard order={order} />
 * </SwipeableCard>
 */

'use client';

import { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

interface SwipeAction {
    icon: React.ReactNode;
    label: string;
    color: 'blue' | 'green' | 'red' | 'yellow';
}

interface SwipeableCardProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    leftAction?: SwipeAction;
    rightAction?: SwipeAction;
    swipeThreshold?: number;
    className?: string;
}

const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
};

export function SwipeableCard({
    children,
    onSwipeLeft,
    onSwipeRight,
    leftAction,
    rightAction,
    swipeThreshold = 100,
    className = ''
}: SwipeableCardProps) {
    const [isRemoving, setIsRemoving] = useState(false);
    const x = useMotionValue(0);
    const background = useTransform(
        x,
        [-swipeThreshold, 0, swipeThreshold],
        [
            leftAction ? colorMap[leftAction.color] : 'transparent',
            'transparent',
            rightAction ? colorMap[rightAction.color] : 'transparent'
        ]
    );

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // Left swipe
        if (offset < -swipeThreshold || velocity < -500) {
            if (onSwipeLeft) {
                setIsRemoving(true);
                setTimeout(() => {
                    onSwipeLeft();
                    setIsRemoving(false);
                }, 200);
            }
        }
        // Right swipe
        else if (offset > swipeThreshold || velocity > 500) {
            if (onSwipeRight) {
                setIsRemoving(true);
                setTimeout(() => {
                    onSwipeRight();
                    setIsRemoving(false);
                }, 200);
            }
        }
    };

    return (
        <div className={`relative overflow-hidden rounded-lg ${className}`}>
            {/* Background actions */}
            <motion.div
                style={{ background }}
                className="absolute inset-0 flex items-center justify-between px-6 text-white"
            >
                {/* Right action (shown on left swipe) */}
                {leftAction && (
                    <div className="flex flex-col items-end ml-auto">
                        <div className="w-12 h-12 flex items-center justify-center">
                            {leftAction.icon}
                        </div>
                        <span className="text-xs font-medium mt-1">{leftAction.label}</span>
                    </div>
                )}

                {/* Left action (shown on right swipe) */}
                {rightAction && (
                    <div className="flex flex-col items-start mr-auto">
                        <div className="w-12 h-12 flex items-center justify-center">
                            {rightAction.icon}
                        </div>
                        <span className="text-xs font-medium mt-1">{rightAction.label}</span>
                    </div>
                )}
            </motion.div>

            {/* Swipeable content */}
            <motion.div
                drag="x"
                dragConstraints={{ left: leftAction ? -swipeThreshold * 1.5 : 0, right: rightAction ? swipeThreshold * 1.5 : 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                style={{ x }}
                animate={isRemoving ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing"
            >
                {children}
            </motion.div>
        </div>
    );
}
