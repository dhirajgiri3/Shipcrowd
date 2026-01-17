/**
 * EmptyState Component
 * 
 * Consistent empty state design for tables, lists, and search results.
 * Uses design system tokens for consistent styling.
 */

import { cn } from '@/src/lib/utils';
import { Inbox, Search, AlertCircle, FileX, Package, Users } from 'lucide-react';
import { Button } from '../core/Button';

// ============================================
// TYPES
// ============================================

export type EmptyStateVariant =
    | 'default'      // Generic empty state
    | 'search'       // No search results
    | 'error'        // Error occurred
    | 'noData'       // No data available
    | 'noItems'      // No items (orders, shipments, etc.)
    | 'noUsers';     // No users/team members

export interface EmptyStateAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    icon?: React.ReactNode;
}

export interface EmptyStateProps {
    variant?: EmptyStateVariant;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: EmptyStateAction;
    secondaryAction?: EmptyStateAction;
    className?: string;
    compact?: boolean;
}

// ============================================
// VARIANT ICONS
// ============================================

const variantIcons: Record<EmptyStateVariant, React.ReactNode> = {
    default: <Inbox className="w-12 h-12" />,
    search: <Search className="w-12 h-12" />,
    error: <AlertCircle className="w-12 h-12" />,
    noData: <FileX className="w-12 h-12" />,
    noItems: <Package className="w-12 h-12" />,
    noUsers: <Users className="w-12 h-12" />,
};

const variantColors: Record<EmptyStateVariant, string> = {
    default: 'text-[var(--text-muted)]',
    search: 'text-[var(--color-blue-500)]',
    error: 'text-[var(--color-red-500)]',
    noData: 'text-[var(--text-muted)]',
    noItems: 'text-[var(--color-orange-500)]',
    noUsers: 'text-[var(--color-purple-500)]',
};

// ============================================
// COMPONENT
// ============================================

/**
 * EmptyState
 * 
 * Displays a consistent empty state with optional action buttons.
 * 
 * @example
 * <EmptyState
 *   variant="search"
 *   title="No results found"
 *   description="Try adjusting your search or filters"
 *   action={{ label: 'Clear filters', onClick: handleClear }}
 * />
 * 
 * @example
 * <EmptyState
 *   variant="noItems"
 *   title="No orders yet"
 *   description="Create your first order to get started"
 *   action={{ label: 'Create Order', onClick: handleCreate, variant: 'primary' }}
 * />
 */
export function EmptyState({
    variant = 'default',
    title,
    description,
    icon,
    action,
    secondaryAction,
    className,
    compact = false,
}: EmptyStateProps) {
    const displayIcon = icon || variantIcons[variant];
    const iconColor = variantColors[variant];

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center',
                compact ? 'py-8 px-4' : 'py-16 px-6',
                className
            )}
        >
            {/* Icon */}
            <div
                className={cn(
                    'flex items-center justify-center rounded-full mb-4',
                    compact ? 'w-16 h-16' : 'w-20 h-20',
                    'bg-[var(--bg-secondary)]',
                    iconColor
                )}
            >
                {displayIcon}
            </div>

            {/* Title */}
            <h3
                className={cn(
                    'font-semibold text-[var(--text-primary)]',
                    compact ? 'text-base' : 'text-lg'
                )}
            >
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p
                    className={cn(
                        'mt-2 text-[var(--text-muted)] max-w-md',
                        compact ? 'text-sm' : 'text-base'
                    )}
                >
                    {description}
                </p>
            )}

            {/* Actions */}
            {(action || secondaryAction) && (
                <div className={cn('flex items-center gap-3 mt-6', compact && 'mt-4')}>
                    {action && (
                        <Button
                            variant={action.variant || 'primary'}
                            onClick={action.onClick}
                            size={compact ? 'sm' : 'md'}
                        >
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            variant={secondaryAction.variant || 'secondary'}
                            onClick={secondaryAction.onClick}
                            size={compact ? 'sm' : 'md'}
                        >
                            {secondaryAction.icon && <span className="mr-2">{secondaryAction.icon}</span>}
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================
// CONVENIENCE COMPONENTS
// ============================================

/**
 * NoSearchResults - Pre-configured empty state for search
 */
export function NoSearchResults({
    onClear,
    searchTerm,
}: {
    onClear?: () => void;
    searchTerm?: string;
}) {
    return (
        <EmptyState
            variant="search"
            title="No results found"
            description={searchTerm
                ? `No results for "${searchTerm}". Try a different search term.`
                : 'Try adjusting your search or filters.'
            }
            action={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
        />
    );
}

/**
 * NoDataAvailable - Pre-configured empty state for no data
 */
export function NoDataAvailable({
    title = 'No data available',
    description = 'There is no data to display at this time.',
}: {
    title?: string;
    description?: string;
}) {
    return (
        <EmptyState
            variant="noData"
            title={title}
            description={description}
        />
    );
}
