/**
 * useReducedMotion Hook
 *
 * Accessibility hook that detects user's motion preferences
 * Respects prefers-reduced-motion system setting
 *
 * Usage:
 * const prefersReducedMotion = useReducedMotion();
 *
 * // In animations
 * animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
 */

import { useState, useEffect } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 * @returns boolean - true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        // Check if window is available (SSR safety)
        if (typeof window === 'undefined') {
            return;
        }

        // Create media query
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        // Set initial value
        setPrefersReducedMotion(mediaQuery.matches);

        // Create listener for changes
        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        // Add listener
        mediaQuery.addEventListener('change', handleChange);

        // Cleanup
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return prefersReducedMotion;
}

/**
 * Helper to get animation props based on reduced motion preference
 *
 * Usage:
 * const animationProps = getAnimationProps(prefersReducedMotion, {
 *   normal: { opacity: 1, y: 0, transition: { duration: 0.5 } },
 *   reduced: { opacity: 1 }
 * });
 */
export function getAnimationProps<T extends Record<string, any>>(
    prefersReducedMotion: boolean,
    animations: {
        normal: T;
        reduced: T;
    }
): T {
    return prefersReducedMotion ? animations.reduced : animations.normal;
}

/**
 * Safe animation variants that respect reduced motion
 *
 * Example:
 * const variants = getSafeVariants({
 *   hidden: { opacity: 0, y: 20 },
 *   visible: { opacity: 1, y: 0 }
 * });
 *
 * // With reduced motion: only opacity changes
 * // Without: full animation
 */
export function getSafeVariants(variants: Record<string, any>, prefersReducedMotion: boolean) {
    if (prefersReducedMotion) {
        // Strip out positional/transform properties for reduced motion
        const safeVariants: Record<string, any> = {};

        Object.keys(variants).forEach(key => {
            const variant = variants[key];
            safeVariants[key] = {
                opacity: variant.opacity,
                // Keep only opacity and scale if they exist
                ...(variant.scale !== undefined && { scale: variant.scale })
            };
        });

        return safeVariants;
    }

    return variants;
}
