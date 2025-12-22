/**
 * UI Components Index
 * 
 * Central export point for all UI components.
 * Enables tree-shaking and clean imports.
 * 
 * Usage:
 * import { Button, Card, Badge } from '@/components/ui';
 */

// Core Components
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Badge, badgeVariants } from './Badge';
export type { BadgeProps } from './Badge';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
export type { CardProps } from './Card';

export { Input } from './Input';
export type { InputProps } from './Input';

// Feedback Components
export { Modal } from './Modal';

// Data Display
export { DataTable } from './DataTable';

// Loading States
export {
    Skeleton,
    CardSkeleton,
    TableSkeleton,
    ChartSkeleton,
    NavSkeleton,
    PageHeaderSkeleton,
    PageSkeleton
} from './Skeleton';

// Form Components
export { Select } from './Select';
export { DateRangePicker } from './DateRangePicker';

// Utility Components
export { Tooltip } from './Tooltip';
