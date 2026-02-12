import { Menu, Transition } from '@headlessui/react'
import { Fragment, ReactElement, ReactNode, cloneElement, isValidElement } from 'react'
import { cn } from '@/src/lib/utils'

// ========================================
// DropdownMenu Root Component
// ========================================
const DropdownMenu = ({ children }: { children: ReactNode }) => (
    <Menu as="div" className="relative inline-block text-left">
        {children}
    </Menu>
)

// ========================================
// DropdownMenu Trigger
// ========================================
const DropdownMenuTrigger = ({ children, asChild, className, ...props }: any) => {
    return (
        <Menu.Button as={Fragment}>
            {asChild && isValidElement(children) ? (
                cloneElement(children as ReactElement, {
                    ...props,
                    className: cn(className, (children.props as any).className),
                })
            ) : (
                <button className={className} {...props}>
                    {children}
                </button>
            )}
        </Menu.Button>
    )
}

// ========================================
// DropdownMenu Content Container
// Premium Flat Design with Smooth Transitions
// ========================================
const DropdownMenuContent = ({ children, align = 'end', className, ...props }: any) => (
    <Transition
        as={Fragment}
        enter="transition ease-[var(--ease-out)] duration-[var(--duration-base)]"
        enterFrom="transform opacity-0 scale-[0.96] translate-y-[-4px]"
        enterTo="transform opacity-100 scale-100 translate-y-0"
        leave="transition ease-[var(--ease-out)] duration-[var(--duration-fast)]"
        leaveFrom="transform opacity-100 scale-100 translate-y-0"
        leaveTo="transform opacity-0 scale-[0.96] translate-y-[-4px]"
    >
        <Menu.Items
            className={cn(
                // Position and spacing
                "absolute mt-2 min-w-[12rem] origin-top-right",
                // Border radius from design system
                "rounded-[var(--radius-lg)]",
                // Background - Deep custom dark for better contrast
                "bg-white dark:bg-[#11131c]",
                // Border - Stronger in dark mode for definition
                "border border-[var(--border-default)] dark:border-[var(--border-strong)]",
                // Shadows - Custom deep shadow for dark mode since global shadows are off
                "shadow-lg dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]",
                // Z-index hierarchy
                "z-[var(--z-dropdown)]",
                // Padding wrapper
                "py-1.5",
                // Alignment
                align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2',
                // Prevent text selection
                "select-none",
                // Focus management
                "outline-none",
                className
            )}
            {...props}
        >
            {children}
        </Menu.Items>
    </Transition>
)

// ========================================
// DropdownMenu Item
// Clean, Minimal with Smooth Hover States
// ========================================
const DropdownMenuItem = ({ children, className, onClick, disabled, destructive, ...props }: any) => (
    <Menu.Item disabled={disabled}>
        {({ active, disabled: itemDisabled }) => (
            <button
                type="button"
                className={cn(
                    // Layout
                    "flex items-center gap-3 w-full",
                    // Spacing - refined padding
                    "px-3 py-2 mx-1.5",
                    // Typography
                    "text-sm font-medium",
                    // Border radius
                    "rounded-[var(--radius-md)]",
                    // Transitions - smooth and premium
                    "transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]",
                    // Default state
                    !itemDisabled && !destructive && "text-[var(--text-primary)] dark:text-gray-200",
                    // Hover state - subtle background with specific dark hover
                    active && !itemDisabled && !destructive && [
                        "bg-[var(--bg-hover)] dark:bg-[#1F2232]",
                        "text-[var(--text-primary)] dark:text-white"
                    ],
                    // Destructive variant
                    destructive && !itemDisabled && [
                        "text-[var(--error)]",
                        active && "bg-[var(--error-bg)]"
                    ],
                    // Disabled state
                    itemDisabled && [
                        "opacity-40",
                        "cursor-not-allowed",
                        "text-[var(--text-muted)]"
                    ],
                    // Active cursor
                    !itemDisabled && "cursor-pointer",
                    className
                )}
                onClick={itemDisabled ? undefined : onClick}
                disabled={itemDisabled}
                {...props}
            >
                {children}
            </button>
        )}
    </Menu.Item>
)

// ========================================
// DropdownMenu Label
// Section Headers for Grouping
// ========================================
const DropdownMenuLabel = ({ children, className }: any) => (
    <div
        className={cn(
            // Spacing
            "px-4.5 py-2 mt-1 mb-0.5",
            // Typography - small, uppercase, tracked
            "text-xs font-semibold uppercase tracking-wide",
            // Color - muted for hierarchy
            "text-[var(--text-muted)]",
            // Prevent selection
            "select-none",
            className
        )}
    >
        {children}
    </div>
)

// ========================================
// DropdownMenu Separator
// Refined Visual Divider
// ========================================
const DropdownMenuSeparator = ({ className }: any) => (
    <div
        className={cn(
            // Spacing - balanced margins
            "my-1.5 mx-1.5",
            // Visual - subtle divider
            "h-px",
            "bg-[var(--border-default)] dark:bg-[var(--border-subtle)]",
            className
        )}
    />
)

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
}
