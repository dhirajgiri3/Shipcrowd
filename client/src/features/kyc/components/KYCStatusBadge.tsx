"use client"

import { Badge } from '@/src/components/ui/core/Badge'
import { ShieldCheck, Clock, AlertCircle, XCircle } from "lucide-react"
import { cn } from "@/src/lib/utils"

export type KYCStatus = "pending" | "verified" | "rejected" | "not_started"

interface KYCStatusBadgeProps {
    status: KYCStatus
    className?: string
    showIcon?: boolean
    size?: "sm" | "md" | "lg"
}

export function KYCStatusBadge({
    status,
    className,
    showIcon = true,
    size = "md"
}: KYCStatusBadgeProps) {
    const config = {
        verified: {
            label: "KYC Verified",
            icon: ShieldCheck,
            variant: "success" as const,
            className: "bg-green-100 text-green-700 border-green-200"
        },
        pending: {
            label: "KYC Pending",
            icon: Clock,
            variant: "warning" as const,
            className: "bg-yellow-100 text-yellow-700 border-yellow-200"
        },
        rejected: {
            label: "KYC Rejected",
            icon: XCircle,
            variant: "destructive" as const,
            className: "bg-red-100 text-red-700 border-red-200"
        },
        not_started: {
            label: "Complete KYC",
            icon: AlertCircle,
            variant: "secondary" as const,
            className: "bg-gray-100 text-gray-700 border-gray-200"
        }
    }

    const { label, icon: Icon, className: statusClass } = config[status]

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
        lg: "text-base px-3 py-1.5"
    }

    return (
        <Badge
            className={cn(
                statusClass,
                sizeClasses[size],
                "flex items-center gap-1 font-medium border",
                className
            )}
        >
            {showIcon && <Icon className={cn(
                size === "sm" && "w-3 h-3",
                size === "md" && "w-3.5 h-3.5",
                size === "lg" && "w-4 h-4"
            )} />}
            {label}
        </Badge>
    )
}
