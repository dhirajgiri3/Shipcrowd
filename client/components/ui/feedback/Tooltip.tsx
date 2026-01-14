"use client";

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/src/lib/utils';

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

            if (side === 'top' && triggerRect.top - tooltipRect.height - 8 < 0) {
                newSide = 'bottom';
            } else if (side === 'bottom' && triggerRect.bottom + tooltipRect.height + 8 > viewportHeight) {
                newSide = 'top';
            }

            if (side === 'left' && triggerRect.left - tooltipRect.width - 8 < 0) {
                newSide = 'right';
            } else if (side === 'right' && triggerRect.right + tooltipRect.width + 8 > viewportWidth) {
                newSide = 'left';
            }

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

    // Translate animation based on side
    const translateClasses = {
        top: isVisible ? 'translate-y-0' : 'translate-y-1',
        bottom: isVisible ? 'translate-y-0' : '-translate-y-1',
        left: isVisible ? 'translate-x-0' : 'translate-x-1',
        right: isVisible ? 'translate-x-0' : '-translate-x-1',
    };

    return (
        <div className="relative inline-block group" ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
            <div
                ref={tooltipRef}
                className={cn(
                    "absolute z-[100] px-2.5 py-1 rounded-md whitespace-nowrap pointer-events-none",
                    "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                    "shadow-lg backdrop-blur-sm",
                    "text-[10px] font-medium text-[var(--text-primary)]",
                    "transition-all duration-200 ease-out",
                    positionClasses[currentSide],
                    translateClasses[currentSide],
                    isVisible ? "opacity-100 visible" : "opacity-0 invisible"
                )}
            >
                {content}
            </div>
        </div>
    );
}
