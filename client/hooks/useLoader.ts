import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useLoader Hook - Intelligent loading state management
 * 
 * Prevents flash for fast operations and ensures smooth UX with minimum display duration.
 * 
 * @param options Configuration options
 * @param options.minDelay - Minimum duration before showing loader (prevents flash). Default: 300ms
 * @param options.minDisplay - If shown, keep visible for at least this duration. Default: 500ms
 * 
 * @returns Loading state controls
 * 
 * @example
 * const { isLoading, showLoader, startLoading, stopLoading } = useLoader({
 *   minDelay: 300,
 *   minDisplay: 500,
 * });
 * 
 * async function fetchData() {
 *   startLoading();
 *   const data = await api.fetch();
 *   stopLoading();
 * }
 * 
 * return (
 *   <>
 *     {showLoader && <Loader variant="spinner" />}
 *     {!isLoading && <DataDisplay />}
 *   </>
 * );
 */

export interface UseLoaderOptions {
    /** Minimum duration before showing loader (prevents flash on quick operations) */
    minDelay?: number;
    /** If shown, keep visible for at least this duration */
    minDisplay?: number;
}

export interface UseLoaderReturn {
    /** Actual loading state (use for disabling buttons, etc.) */
    isLoading: boolean;
    /** UI loading state (use for showing loaders) - respects delays */
    showLoader: boolean;
    /** Start loading */
    startLoading: () => void;
    /** Stop loading */
    stopLoading: () => void;
    /** Reset all timers */
    reset: () => void;
}

export function useLoader(options: UseLoaderOptions = {}): UseLoaderReturn {
    const { minDelay = 300, minDisplay = 500 } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [showLoader, setShowLoader] = useState(false);

    const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
    const displayTimerRef = useRef<NodeJS.Timeout | null>(null);
    const showTimeRef = useRef<number | null>(null);

    const clearTimers = useCallback(() => {
        if (delayTimerRef.current) {
            clearTimeout(delayTimerRef.current);
            delayTimerRef.current = null;
        }
        if (displayTimerRef.current) {
            clearTimeout(displayTimerRef.current);
            displayTimerRef.current = null;
        }
    }, []);

    const startLoading = useCallback(() => {
        setIsLoading(true);

        // Clear any existing timers
        clearTimers();

        // Schedule showing the loader after minDelay
        delayTimerRef.current = setTimeout(() => {
            setShowLoader(true);
            showTimeRef.current = Date.now();
        }, minDelay);
    }, [minDelay, clearTimers]);

    const stopLoading = useCallback(() => {
        setIsLoading(false);

        // Clear delay timer if loader hasn't been shown yet
        if (delayTimerRef.current) {
            clearTimeout(delayTimerRef.current);
            delayTimerRef.current = null;
            // Loader was never shown, so don't show it
            setShowLoader(false);
            return;
        }

        // If loader is showing, ensure it's visible for minDisplay duration
        if (showLoader && showTimeRef.current) {
            const elapsed = Date.now() - showTimeRef.current;
            const remaining = minDisplay - elapsed;

            if (remaining > 0) {
                // Keep showing for remaining time
                displayTimerRef.current = setTimeout(() => {
                    setShowLoader(false);
                    showTimeRef.current = null;
                }, remaining);
            } else {
                // Already shown long enough
                setShowLoader(false);
                showTimeRef.current = null;
            }
        } else {
            setShowLoader(false);
            showTimeRef.current = null;
        }
    }, [showLoader, minDisplay]);

    const reset = useCallback(() => {
        clearTimers();
        setIsLoading(false);
        setShowLoader(false);
        showTimeRef.current = null;
    }, [clearTimers]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearTimers();
        };
    }, [clearTimers]);

    return {
        isLoading,
        showLoader,
        startLoading,
        stopLoading,
        reset,
    };
}
