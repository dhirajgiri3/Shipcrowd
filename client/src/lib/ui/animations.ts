/**
 * Reusable Framer Motion Animation Variants
 * Centralized animation configurations for consistent motion design
 */

// Standard easing for smooth animations
export const EASING = [0.22, 1, 0.36, 1]; // Custom ease-out curve

// Card entrance and hover animations
export const cardVariants = {
    initial: {
        opacity: 0,
        y: 20,
        scale: 0.95
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: EASING
        }
    },
    hover: {
        y: -8,
        scale: 1.02,
        transition: {
            duration: 0.3,
            ease: EASING
        }
    }
};

// Compact card variant (for grid items)
export const compactCardVariants = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: EASING
        }
    },
    hover: {
        y: -6,
        scale: 1.01,
        transition: { duration: 0.25 }
    }
};

// Icon animations
export const iconVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: {
        scale: 1.15,
        rotate: 5,
        transition: { duration: 0.3 }
    }
};

// Glow effect animations
export const glowVariants = {
    initial: { opacity: 0, scale: 0.8 },
    hover: {
        opacity: 0.15,
        scale: 1.2,
        transition: { duration: 0.4 }
    }
};

// Stagger container variants
export const staggerContainerVariants = (staggerDelay = 0.1, initialDelay = 0.2) => ({
    visible: {
        transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay
        }
    }
});

// Stagger item variants (slide from left)
export const staggerItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.4 }
    }
};

// Fade and slide up
export const fadeSlideUpVariants = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay }
    }
});

// Fade and slide from right
export const fadeSlideRightVariants = (delay = 0) => ({
    initial: { opacity: 0, x: 20 },
    animate: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.5, delay }
    }
});

// Timeline connector animation
export const timelineVariants = {
    initial: { scaleY: 0 },
    animate: {
        scaleY: 1,
        transition: { duration: 1, delay: 0.6 }
    }
};

// Sequential reveal variant (for lists)
export const listItemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.9 },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { duration: 0.4 }
    }
};

// Button interaction variants
export const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
};

// Compact button variants
export const compactButtonVariants = {
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
};
