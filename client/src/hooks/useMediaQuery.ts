import { useState, useEffect } from 'react';

type MediaQuery = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints: Record<MediaQuery, string> = {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
    '2xl': '(min-width: 1536px)',
};

export function useMediaQuery(query: MediaQuery | string): boolean {
    const mediaQuery = query in breakpoints ? breakpoints[query as MediaQuery] : query;
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQueryList = window.matchMedia(mediaQuery);
        const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

        // Set initial value
        setMatches(mediaQueryList.matches);

        // Listen for changes
        mediaQueryList.addEventListener('change', listener);

        return () => mediaQueryList.removeEventListener('change', listener);
    }, [mediaQuery]);

    return matches;
}
