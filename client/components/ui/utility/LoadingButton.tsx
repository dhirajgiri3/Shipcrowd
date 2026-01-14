import * as React from "react"
import { cn } from "@/src/lib/utils"
import { DotsLoader } from "../feedback/Loader"

export interface LoadingButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean
    loadingText?: string
    /** Variant of loader to use when loading */
    loadingVariant?: 'dots' | 'spinner'
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
    ({ className, children, isLoading, loadingText, loadingVariant = 'dots', disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:opacity-50 disabled:pointer-events-none",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "h-10 py-2 px-4",
                    className
                )}
                disabled={isLoading || disabled}
                {...props}
            >
                {isLoading ? (
                    <>
                        <DotsLoader size="sm" />
                        {loadingText || "Loading..."}
                    </>
                ) : (
                    children
                )}
            </button>
        )
    }
)
LoadingButton.displayName = "LoadingButton"

export { LoadingButton }
