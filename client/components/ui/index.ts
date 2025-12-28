/**
 * UI Components Index
 * 
 * Central export point for all UI components.
 * Enables tree-shaking and clean imports.
 * 
 * Usage:
 * import { Button, Card, Badge } from '@/components/ui';
 */

// ============================================
// CORE COMPONENTS (Foundational primitives)
// ============================================
export { Button } from './core/Button';
export type { ButtonProps } from './core/Button';

export { Badge, badgeVariants } from './core/Badge';
export type { BadgeProps } from './core/Badge';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './core/Card';
export type { CardProps } from './core/Card';

export { Input } from './core/Input';
export type { InputProps } from './core/Input';

export { Textarea } from './core/Textarea';
export type { TextareaProps } from './core/Textarea';

// ============================================
// FEEDBACK COMPONENTS (User notifications)
// ============================================
export { Alert } from './feedback/Alert';
export { Modal } from './feedback/Modal';
export { useToast } from './feedback/Toast';
export { Toaster } from './feedback/Toaster';
export { Tooltip } from './feedback/Tooltip';

export { Loader, TruckLoader, SpinnerLoader, DotsLoader, ProgressLoader } from './feedback/Loader';
export type { LoaderProps, LoaderVariant, LoaderSize } from './feedback/Loader';

// ============================================
// DATA COMPONENTS (Display & loading)
// ============================================
export { DataTable } from './data/DataTable';
export {
    Skeleton,
    CardSkeleton,
    TableSkeleton,
    ChartSkeleton,
    NavSkeleton,
    PageHeaderSkeleton,
    PageSkeleton
} from './data/Skeleton';

// ============================================
// FORM COMPONENTS (User input)
// ============================================
export { Select } from './form/Select';
export { DateRangePicker } from './form/DateRangePicker';
export { FormInput } from './form/FormInput';
export { PasswordStrengthIndicator } from './form/PasswordStrengthIndicator';

// ============================================
// LAYOUT COMPONENTS (Page structure)
// ============================================
export { Navigation } from './layout/Navigation';
export { Footer } from './layout/Footer';

// ============================================
// UTILITY COMPONENTS (Misc helpers)
// ============================================
export { RadialProgress } from './utility/RadialProgress';
export { LoadingButton } from './utility/LoadingButton';
