import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-primaryBlue text-white hover:bg-primaryBlue/90 shadow-blue hover:shadow-blue-lg hover:-translate-y-0.5 transition-all duration-200",
                destructive:
                    "bg-rose text-white hover:bg-rose/90",
                outline:
                    "border border-charcoal-200 bg-background hover:bg-charcoal-50 hover:text-accent-foreground",
                secondary:
                    "bg-charcoal-100 text-charcoal-900 hover:bg-charcoal-200",
                ghost: "hover:bg-charcoal-50 hover:text-charcoal-900",
                link: "text-primaryBlue underline-offset-4 hover:underline",
                gradient: "bg-gradient-blue text-white shadow-blue hover:shadow-blue-lg hover:scale-[1.02] transition-all duration-300",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-14 rounded-xl px-8 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

// Add motion support
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
