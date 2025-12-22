import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for animating number values with easing
 * @param end - The target number to count to
 * @param duration - Animation duration in milliseconds
 * @param start - Starting number (default: 0)
 * @param decimals - Number of decimal places (default: 0)
 */
export function useCountUp(end: number, duration: number = 2000, start: number = 0, decimals: number = 0) {
    const [count, setCount] = useState(start);
    const countRef = useRef(start);
    const rafRef = useRef<number | undefined>(undefined);
    const startTimeRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        // Reset for new end value
        startTimeRef.current = undefined;
        countRef.current = start;
        
        const animate = (currentTime: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = currentTime;
            }

            const elapsed = currentTime - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (easeOutExpo for smooth deceleration)
            const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            const current = start + (end - start) * easeOutExpo;
            countRef.current = current;
            setCount(current);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [end, duration, start]);

    return decimals > 0 ? count.toFixed(decimals) : Math.floor(count);
}

/**
 * Animated counter component
 */
interface AnimatedNumberProps {
    value: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

export function AnimatedNumber({ 
    value, 
    duration = 2000, 
    decimals = 0, 
    prefix = '', 
    suffix = '',
    className = ''
}: AnimatedNumberProps) {
    const animatedValue = useCountUp(value, duration, 0, decimals);
    
    return (
        <span className={className}>
            {prefix}{animatedValue}{suffix}
        </span>
    );
}
