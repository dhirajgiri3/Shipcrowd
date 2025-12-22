import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../utils/cn"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue)]/80",
                secondary:
                    "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80",
                destructive:
                    "border-transparent bg-rose-500 text-white hover:bg-rose-500/80",
                error:
                    "border-transparent bg-rose-500 text-white hover:bg-rose-500/80",
                outline: "text-foreground border-[var(--border-default)]",
                success: "border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                warning: "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200",
                info: "border-transparent bg-cyan-100 text-cyan-700 hover:bg-cyan-200",
                neutral: "border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
