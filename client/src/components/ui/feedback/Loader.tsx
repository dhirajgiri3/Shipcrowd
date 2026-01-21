import React from 'react';
import { cn } from '@/src/lib/utils';

/**
 * Loader Component - Unified loading system for Helix
 * 
 * Provides multiple loader variants based on the 3-tier loading strategy:
 * - Truck: Branded animation for high-value moments (tracking, shipment creation)
 * - Spinner: Circular loading for sections/cards
 * - Dots: 3-dot animation for inline/button states
 * - Progress: Progress bar for operations with known progress
 * 
 * @example
 * // Truck loader for tracking
 * <Loader variant="truck" size="lg" message="Tracking your package..." />
 * 
 * // Dots for button
 * <Loader variant="dots" size="sm" />
 * 
 * // Progress bar
 * <Loader variant="progress" progress={65} message="Uploading..." />
 */

export type LoaderVariant = 'truck' | 'spinner' | 'dots' | 'progress';
export type LoaderSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LoaderProps {
  /** Variant of the loader */
  variant?: LoaderVariant;
  /** Size of the loader */
  size?: LoaderSize;
  /** Optional loading message */
  message?: string;
  /** Progress percentage (0-100) for progress variant */
  progress?: number;
  /** Additional CSS classes */
  className?: string;
  /** Center the loader */
  centered?: boolean;
}

const sizeMap = {
  truck: {
    sm: 'w-32 h-16',
    md: 'w-48 h-24',
    lg: 'w-64 h-32',
    xl: 'w-80 h-40',
  },
  spinner: {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  },
  dots: {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  },
  progress: {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4',
  },
};

export function Loader({
  variant = 'spinner',
  size = 'md',
  message,
  progress = 0,
  className,
  centered = false,
}: LoaderProps) {
  const containerClasses = cn(
    'flex flex-col items-center justify-center gap-3',
    centered && 'min-h-[200px]',
    className
  );

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      {variant === 'truck' && <TruckLoader size={size} />}
      {variant === 'spinner' && <SpinnerLoader size={size} />}
      {variant === 'dots' && <DotsLoader size={size} />}
      {variant === 'progress' && <ProgressLoader size={size} progress={progress} />}

      {message && (
        <p className="text-sm text-[var(--text-secondary)] font-medium animate-fade-in">
          {message}
        </p>
      )}

      <span className="sr-only">Loading...</span>
    </div>
  );
}

/** Truck Animation Loader - Branded loader for high-value moments */
function TruckLoader({ size }: { size: LoaderSize }) {
  const sizeClass = sizeMap.truck[size];

  return (
    <div className={cn('loader-truck relative', sizeClass)}>
      <div className="truck-wrapper w-full h-full flex flex-col items-center justify-end overflow-hidden">
        {/* Truck Body with suspension animation */}
        <div className="truck-body mb-1.5 animate-truck-suspension">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 198 93"
            className="w-full h-auto"
          >
            {/* Truck Cabin (Driver Section) - PRIMARY BLUE BRAND COLOR */}
            <path
              strokeWidth="3"
              stroke="var(--gray-900)"
              fill="var(--primary-blue)"
              d="M135 22.5H177.264C178.295 22.5 179.22 23.133 179.594 24.0939L192.33 56.8443C192.442 57.1332 192.5 57.4404 192.5 57.7504V89C192.5 90.3807 191.381 91.5 190 91.5H135C133.619 91.5 132.5 90.3807 132.5 89V25C132.5 23.6193 133.619 22.5 135 22.5Z"
              className="dark:fill-[var(--primary-blue-hover)] dark:stroke-[var(--gray-400)]"
            />
            {/* Cabin Window - Darker blue for depth */}
            <path
              strokeWidth="3"
              stroke="var(--gray-900)"
              fill="var(--primary-blue-deep)"
              d="M146 33.5H181.741C182.779 33.5 183.709 34.1415 184.078 35.112L190.538 52.112C191.16 53.748 189.951 55.5 188.201 55.5H146C144.619 55.5 143.5 54.3807 143.5 53V36C143.5 34.6193 144.619 33.5 146 33.5Z"
              className="dark:fill-[var(--primary-blue-active)] dark:stroke-[var(--gray-400)]"
            />
            {/* Door handle - Accent detail */}
            <path
              strokeWidth="2"
              stroke="var(--gray-900)"
              fill="var(--gray-100)"
              d="M150 65C150 65.39 149.763 65.8656 149.127 66.2893C148.499 66.7083 147.573 67 146.5 67C145.427 67 144.501 66.7083 143.873 66.2893C143.237 65.8656 143 65.39 143 65C143 64.61 143.237 64.1344 143.873 63.7107C144.501 63.2917 145.427 63 146.5 63C147.573 63 148.499 63.2917 149.127 63.7107C149.763 64.1344 150 64.61 150 65Z"
              className="dark:fill-[var(--gray-600)] dark:stroke-[var(--gray-300)]"
            />
            {/* Headlight - Warm yellow (complementary to blue) */}
            <rect
              strokeWidth="2"
              stroke="var(--gray-900)"
              fill="#FCD34D"
              rx="1"
              height="7"
              width="5"
              y="63"
              x="187"
              className="dark:stroke-[var(--gray-400)] dark:fill-[#FBBF24]"
            />
            {/* Exhaust - Dark detail */}
            <rect
              strokeWidth="2"
              stroke="var(--gray-900)"
              fill="var(--gray-800)"
              rx="1"
              height="11"
              width="4"
              y="81"
              x="193"
              className="dark:fill-[var(--gray-400)] dark:stroke-[var(--gray-500)]"
            />
            {/* Main Cargo Container - Light gray for balance */}
            <rect
              strokeWidth="3"
              stroke="var(--gray-900)"
              fill="var(--gray-100)"
              rx="2.5"
              height="90"
              width="121"
              y="1.5"
              x="6.5"
              className="dark:fill-[var(--gray-800)] dark:stroke-[var(--gray-400)]"
            />
            {/* Helix Branding Text on Cargo */}
            <text
              x="67"
              y="50"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill="var(--gray-800)"
              className="dark:fill-[var(--gray-300)]"
              style={{
                fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              Helix
            </text>
            {/* Bumper - Matches cargo */}
            <rect
              strokeWidth="2"
              stroke="var(--gray-900)"
              fill="var(--gray-100)"
              rx="2"
              height="4"
              width="6"
              y="84"
              x="1"
              className="dark:fill-[var(--gray-800)] dark:stroke-[var(--gray-400)]"
            />
          </svg>
        </div>

        {/* Tires with rotation */}
        <div className="truck-tires absolute bottom-0 flex items-center justify-between px-3.5 w-[65%]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 30 30"
            className="w-6 h-6 animate-truck-wheel"
          >
            <circle
              strokeWidth="3"
              stroke="var(--gray-900)"
              fill="var(--gray-900)"
              r="13.5"
              cy="15"
              cx="15"
              className="dark:fill-[var(--gray-300)] dark:stroke-[var(--gray-400)]"
            />
            <circle
              fill="var(--gray-200)"
              r="7"
              cy="15"
              cx="15"
              className="dark:fill-[var(--gray-600)]"
            />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 30 30"
            className="w-6 h-6 animate-truck-wheel"
          >
            <circle
              strokeWidth="3"
              stroke="var(--gray-900)"
              fill="var(--gray-900)"
              r="13.5"
              cy="15"
              cx="15"
              className="dark:fill-[var(--gray-300)] dark:stroke-[var(--gray-400)]"
            />
            <circle
              fill="var(--gray-200)"
              r="7"
              cy="15"
              cx="15"
              className="dark:fill-[var(--gray-600)]"
            />
          </svg>
        </div>

        {/* Road */}
        <div className="road w-full h-0.5 bg-[var(--border-default)] relative" />

        {/* Lamp post */}
        <svg
          xmlSpace="preserve"
          viewBox="0 0 453.459 453.459"
          xmlns="http://www.w3.org/2000/svg"
          className="lamp-post absolute bottom-0 right-0 h-[90%] animate-truck-road"
          fill="var(--gray-400)"
        >
          <path
            className="dark:fill-[var(--gray-500)]"
            d="M252.882,0c-37.781,0-68.686,29.953-70.245,67.358h-6.917v8.954c-26.109,2.163-45.463,10.011-45.463,19.366h9.993
c-1.65,5.146-2.507,10.54-2.507,16.017c0,28.956,23.558,52.514,52.514,52.514c28.956,0,52.514-23.558,52.514-52.514
c0-5.478-0.856-10.872-2.506-16.017h9.992c0-9.354-19.352-17.204-45.463-19.366v-8.954h-6.149C200.189,38.779,223.924,16,252.882,16
c29.952,0,54.32,24.368,54.32,54.32c0,28.774-11.078,37.009-25.105,47.437c-17.444,12.968-37.216,27.667-37.216,78.884v113.914
h-0.797c-5.068,0-9.174,4.108-9.174,9.177c0,2.844,1.293,5.383,3.321,7.066c-3.432,27.933-26.851,95.744-8.226,115.459v11.202h45.75
v-11.202c18.625-19.715-4.794-87.527-8.227-115.459c2.029-1.683,3.322-4.223,3.322-7.066c0-5.068-4.107-9.177-9.176-9.177h-0.795
V196.641c0-43.174,14.942-54.283,30.762-66.043c14.793-10.997,31.559-23.461,31.559-60.277C323.202,31.545,291.656,0,252.882,0z
M232.77,111.694c0,23.442-19.071,42.514-42.514,42.514c-23.442,0-42.514-19.072-42.514-42.514c0-5.531,1.078-10.957,3.141-16.017
h78.747C231.693,100.736,232.77,106.162,232.77,111.694z"
          />
        </svg>
      </div>
    </div >
  );
}

/** Spinner Loader - Circular loading animation */
function SpinnerLoader({ size }: { size: LoaderSize }) {
  const sizeClass = sizeMap.spinner[size];

  return (
    <div
      className={cn(
        'loader-spinner border-2 border-[var(--border-default)] border-t-[var(--primary-blue)] rounded-full animate-spin',
        sizeClass
      )}
    />
  );
}

/** Dots Loader - 3-dot bounce animation for inline states */
function DotsLoader({ size }: { size: LoaderSize }) {
  const dotSize = sizeMap.dots[size];

  return (
    <div className="loader-dots flex items-center gap-1">
      <div
        className={cn(
          'rounded-full bg-[var(--primary-blue)] animate-dots-bounce',
          dotSize
        )}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={cn(
          'rounded-full bg-[var(--primary-blue)] animate-dots-bounce',
          dotSize
        )}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={cn(
          'rounded-full bg-[var(--primary-blue)] animate-dots-bounce',
          dotSize
        )}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

/** Progress Loader - Progress bar with percentage */
function ProgressLoader({ size, progress }: { size: LoaderSize; progress: number }) {
  const heightClass = sizeMap.progress[size];
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="loader-progress w-full max-w-md">
      <div
        className={cn(
          'w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden',
          heightClass
        )}
      >
        <div
          className={cn(
            'h-full bg-[var(--primary-blue)] transition-all duration-300 ease-out rounded-full',
            clampedProgress === 0 && 'w-0'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {clampedProgress > 0 && (
        <p className="text-xs text-[var(--text-tertiary)] text-center mt-1 tabular-nums">
          {clampedProgress}%
        </p>
      )}
    </div>
  );
}

// Export individual loaders for direct use
export { TruckLoader, SpinnerLoader, DotsLoader, ProgressLoader };
