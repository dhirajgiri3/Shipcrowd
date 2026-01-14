/**
 * useDebouncedValue Hook
 * 
 * Debounces a value to prevent excessive updates/API calls
 * Commonly used for search inputs to reduce backend requests
 * 
 * @example
 * const [searchInput, setSearchInput] = useState('');
 * const debouncedSearch = useDebouncedValue(searchInput, 300);
 * 
 * useEffect(() => {
 *   // API call with debouncedSearch
 * }, [debouncedSearch]);
 */

import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set up the timeout
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup function - cancel timeout if value changes before delay
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * useDebouncedCallback Hook
 * 
 * Debounces a callback function
 * Useful for debouncing event handlers directly
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback((query: string) => {
 *   fetchResults(query);
 * }, 300);
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300
): (...args: Parameters<T>) => void {
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        const newTimeoutId = setTimeout(() => {
            callback(...args);
        }, delay);

        setTimeoutId(newTimeoutId);
    };
}
