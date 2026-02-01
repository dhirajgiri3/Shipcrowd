"use client";

import { useEffect, useState } from "react";

export function getCountUp(
    end: number,
    duration: number = 2000,
    start: number = 0
): number[] {
    // Simplified logic for brevity, returns array of numbers for animation frames
    // Since this is a hook value, we can just implement the hook logic directly below
    return [];
}

export const useCountUp = (
    end: number,
    duration: number = 2000,
    start: number = 0
) => {
    const [count, setCount] = useState(start);

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrameId: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Easing function (easeOutExpo)
            const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);

            setCount(Math.floor(start + (end - start) * ease));

            if (progress < duration) {
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [end, duration, start]);

    return count;
};

export const AnimatedNumber = ({ value }: { value: number }) => {
    const count = useCountUp(value);
    return <>{ count.toLocaleString('en-IN') } </>;
};
