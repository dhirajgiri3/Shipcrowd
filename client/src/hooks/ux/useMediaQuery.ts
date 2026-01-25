/**
 * useMediaQuery - Responsive design utilities
 * Psychology: Adapt UI to device capabilities
 * 
 * Usage:
 * const isMobile = useIsMobile(); // < 768px
 * const isTablet = useIsTablet(); // 768px - 1024px
 * const isDesktop = useIsDesktop(); // > 1024px
 */

'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        // SSR-safe initialization
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const media = window.matchMedia(query);

        // Define listener
        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);

        // Add listener
        media.addEventListener('change', listener);

        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

// Predefined breakpoints for Shipcrowd
// Mobile-first approach: 70% of users are on mobile
export const BREAKPOINTS = {
    mobile: '(max-width: 767px)',
    tablet: '(min-width: 768px) and (max-width: 1023px)',
    desktop: '(min-width: 1024px)',

    // Specific mobile sizes for testing
    mobileSm: '(max-width: 374px)',   // 360px devices
    mobileMd: '(min-width: 375px) and (max-width: 389px)', // 375px devices (iPhone)
    mobileLg: '(min-width: 390px) and (max-width: 767px)', // 390px+ devices

    // Touch vs mouse
    touch: '(hover: none) and (pointer: coarse)',
    mouse: '(hover: hover) and (pointer: fine)'
} as const;

// Convenience hooks
export function useIsMobile(): boolean {
    return useMediaQuery(BREAKPOINTS.mobile);
}

export function useIsTablet(): boolean {
    return useMediaQuery(BREAKPOINTS.tablet);
}

export function useIsDesktop(): boolean {
    return useMediaQuery(BREAKPOINTS.desktop);
}

export function useIsTouchDevice(): boolean {
    return useMediaQuery(BREAKPOINTS.touch);
}

// Combined hook for complex responsive logic
export function useResponsive() {
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();
    const isDesktop = useIsDesktop();
    const isTouchDevice = useIsTouchDevice();

    return {
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        // Derived states
        isMobileOrTablet: isMobile || isTablet,
        showBottomNav: isMobile, // Only show bottom nav on mobile
        showSidebar: !isMobile,  // Show sidebar on tablet/desktop
        columnsForGrid: isMobile ? 1 : isTablet ? 2 : 3,
        maxItemsInRow: isMobile ? 1 : isTablet ? 2 : 4
    };
}

// Hook for viewport dimensions
export function useViewport() {
    const [viewport, setViewport] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0
    });

    useEffect(() => {
        const handleResize = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return viewport;
}
