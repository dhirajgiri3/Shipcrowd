import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primaryBlue text-white hover:bg-primaryBlue/80",
                secondary:
                    "border-transparent bg-charcoal-100 text-charcoal-900 hover:bg-charcoal-100/80",
                destructive:
                    "border-transparent bg-rose text-white hover:bg-rose/80",
                outline: "text-foreground",
                success: "border-transparent bg-emerald/10 text-emerald hover:bg-emerald/20",
                warning: "border-transparent bg-amber/10 text-amber hover:bg-amber/20",
                info: "border-transparent bg-cyan/10 text-cyan hover:bg-cyan/20",
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
