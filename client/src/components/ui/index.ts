/**
 * UI Components Index
 * 
 * Central export point for all UI components.
 * Enables tree-shaking and clean imports.
 * 
 * Usage:
 * import { Button, Card, Badge } from '@/src/components/ui';
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

export { Checkbox } from './core/Checkbox';
export type { CheckboxProps } from './core/Checkbox';

export { Textarea } from './core/Textarea';
export type { TextareaProps } from './core/Textarea';

export { Label } from './core/Label';
export type { LabelProps } from './core/Label';

export { Switch } from './core/Switch';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './core/Tabs';
export { PillTabs } from './core/PillTabs';
export type { PillTab, PillTabsProps } from './core/PillTabs';

export { Avatar } from './core/Avatar';
export type { AvatarProps } from './core/Avatar';

// ============================================
// FEEDBACK COMPONENTS (User notifications)
// ============================================
export { Alert } from './feedback/Alert';
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './feedback/Dialog';
export { Modal } from './feedback/Modal';
export { ConfirmDialog } from './feedback/ConfirmDialog';
export { PromptDialog } from './feedback/PromptDialog';
export { useToast } from './feedback/Toast';
export { Toaster } from './feedback/Toaster';
export { Tooltip } from './feedback/Tooltip';
export { PageError } from './feedback/PageError';
export type { PageErrorProps } from './feedback/PageError';

export { Loader, TruckLoader, SpinnerLoader, DotsLoader, ProgressLoader } from './feedback/Loader';
export type { LoaderProps, LoaderVariant, LoaderSize } from './feedback/Loader';

export { EmptyState, NoSearchResults, NoDataAvailable } from './feedback/EmptyState';
export type { EmptyStateProps, EmptyStateVariant, EmptyStateAction } from './feedback/EmptyState';

// ============================================
// DATA COMPONENTS (Display & loading)
// ============================================
export { DataTable } from './data/DataTable';
export { Pagination } from './data/Pagination';
export type { PaginationProps } from './data/Pagination';
export { StatusBadge, StatusBadges } from './data/StatusBadge';
export type { StatusBadgeProps, StatusBadgesProps, StatusDomain } from './data/StatusBadge';
export {
    Skeleton,
    CardSkeleton,
    TableSkeleton,
    ChartSkeleton,
    NavSkeleton,
    PageHeaderSkeleton,
    PageSkeleton,
    StandardPageLoading,
} from './data/Skeleton';
export type { PageLoadingLayout } from './data/Skeleton';

// ============================================
// FORM COMPONENTS (User input)
// ============================================
export { Select } from './form/Select';
export { DateRangePicker } from './form/DateRangePicker';
export { FormInput } from './form/FormInput';
export { FormField } from './form/FormField';
export { PasswordStrengthIndicator } from './form/PasswordStrengthIndicator';
export { SearchInput } from './form/SearchInput';

// ============================================
// LAYOUT COMPONENTS (Page structure)
// ============================================
export { Navigation } from './layout/Navigation';
export { Footer } from './layout/Footer';
export { PageHeader } from './layout/PageHeader';

// ============================================
// UTILITY COMPONENTS (Misc helpers)
// ============================================
export { RadialProgress } from './utility/RadialProgress';
export { LoadingButton } from './utility/LoadingButton';
export { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
