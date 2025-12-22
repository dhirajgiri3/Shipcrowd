"use client";

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export function Tooltip({ content, children, side = 'top', delay = 200 }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentSide, setCurrentSide] = useState(side);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
            // Reset side to preference before calculation
            setCurrentSide(side);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    // Smart positioning logic
    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newSide = side;

            // Check vertical overflow
            if (side === 'top' && triggerRect.top - tooltipRect.height - 8 < 0) {
                newSide = 'bottom';
            } else if (side === 'bottom' && triggerRect.bottom + tooltipRect.height + 8 > viewportHeight) {
                newSide = 'top';
            }

            // Check horizontal overflow
            if (side === 'left' && triggerRect.left - tooltipRect.width - 8 < 0) {
                newSide = 'right';
            } else if (side === 'right' && triggerRect.right + tooltipRect.width + 8 > viewportWidth) {
                newSide = 'left';
            }

            // Additional check: if flipping didn't help (e.g. both top and bottom are tight), prioritize visibility
            // For now, we simple flip. We could add more complex logic (e.g. fallback to left/right) if needed.

            setCurrentSide(newSide);
        }
    }, [isVisible, side]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
        left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
        right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
    };

    return (
        <div className="relative inline-block" ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
            {isVisible && (
                <div
                    ref={tooltipRef}
                    className={cn(
                        "absolute z-[100] px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none",
                        "animate-in fade-in duration-150",
                        positionClasses[currentSide]
                    )}
                >
                    {content}
                    <div className={cn(
                        "absolute w-0 h-0 border-4",
                        arrowClasses[currentSide]
                    )} />
                </div>
            )}
        </div>
    );
}
