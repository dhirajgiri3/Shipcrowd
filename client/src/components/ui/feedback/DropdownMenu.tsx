import * as React from "react"

const DropdownMenu = ({ children }: { children: React.ReactNode }) => <div className="relative inline-block text-left">{children}</div>

const DropdownMenuTrigger = ({ children, asChild, ...props }: any) => {
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement, {
            ...props, onClick: (e: any) => {
                (children.props as any).onClick?.(e);
                // toggle logic would go here
            }
        })
    }
    return <button {...props}>{children}</button>
}

const DropdownMenuContent = ({ children, align, ...props }: any) => (
    <div className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
        {children}
    </div>
)

const DropdownMenuItem = ({ children, className, ...props }: any) => (
    <div className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${className}`} {...props}>
        {children}
    </div>
)

const DropdownMenuLabel = ({ children }: any) => <div className="px-4 py-2 text-xs font-semibold text-gray-500">{children}</div>

const DropdownMenuSeparator = () => <div className="my-1 h-px bg-gray-200" />

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
}
