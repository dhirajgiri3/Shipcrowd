/**
 * useSwipeGesture - Touch gesture detection
 * Psychology: Natural mobile interactions
 * 
 * Usage:
 * const { onTouchStart, onTouchMove, onTouchEnd, direction } = useSwipeGesture({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 *   threshold: 50
 * });
 * 
 * <div {...{ onTouchStart, onTouchMove, onTouchEnd }}>
 *   Swipeable content
 * </div>
 */

'use client';

import { useState, useRef, TouchEvent } from 'react';

type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

interface SwipeGestureConfig {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number; // Minimum distance in pixels to trigger swipe
    velocityThreshold?: number; // Minimum velocity to trigger swipe
}

interface TouchPosition {
    x: number;
    y: number;
    time: number;
}

export function useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocityThreshold = 0.3
}: SwipeGestureConfig) {
    const [direction, setDirection] = useState<SwipeDirection>(null);
    const touchStart = useRef<TouchPosition | null>(null);
    const touchEnd = useRef<TouchPosition | null>(null);

    const onTouchStart = (e: TouchEvent) => {
        touchEnd.current = null;
        touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
    };

    const onTouchMove = (e: TouchEvent) => {
        touchEnd.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;

        const deltaX = touchStart.current.x - touchEnd.current.x;
        const deltaY = touchStart.current.y - touchEnd.current.y;
        const deltaTime = touchEnd.current.time - touchStart.current.time;

        // Calculate velocity (pixels per millisecond)
        const velocityX = Math.abs(deltaX) / deltaTime;
        const velocityY = Math.abs(deltaY) / deltaTime;

        // Determine if swipe meets thresholds
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
        const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);

        // Horizontal swipe
        if (isHorizontalSwipe && Math.abs(deltaX) > threshold && velocityX > velocityThreshold) {
            if (deltaX > 0) {
                // Swiped left
                setDirection('left');
                onSwipeLeft?.();
            } else {
                // Swiped right
                setDirection('right');
                onSwipeRight?.();
            }
        }
        // Vertical swipe
        else if (isVerticalSwipe && Math.abs(deltaY) > threshold && velocityY > velocityThreshold) {
            if (deltaY > 0) {
                // Swiped up
                setDirection('up');
                onSwipeUp?.();
            } else {
                // Swiped down
                setDirection('down');
                onSwipeDown?.();
            }
        }

        // Reset after a short delay
        setTimeout(() => setDirection(null), 100);
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        direction
    };
}

// Alternative hook for simpler use cases
export function useSwipe(
    onLeft?: () => void,
    onRight?: () => void,
    threshold = 50
) {
    return useSwipeGesture({
        onSwipeLeft: onLeft,
        onSwipeRight: onRight,
        threshold
    });
}
