"use client";

import { Button } from '@/src/components/ui/core/Button';
import { cn } from '@/src/lib/utils';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
    active?: boolean;
}

interface PageHeaderProps {
    title: ReactNode | string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
    subtitle?: ReactNode;
    description?: ReactNode;
    className?: string;
    backUrl?: string; // Optional custom back URL, defaults to router.back()
    showBack?: boolean;
}

export function PageHeader({
    title,
    breadcrumbs = [],
    actions,
    subtitle,
    description,
    className,
    backUrl,
    showBack = true
}: PageHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (backUrl) {
            router.push(backUrl);
        } else {
            router.back();
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)}>
            {/* Navigation & Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] animate-in fade-in slide-in-from-top-2 duration-300">
                {showBack && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                            className="h-8 px-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                        <span className="text-[var(--border-default)]">|</span>
                    </>
                )}

                {breadcrumbs.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        {index > 0 && <ChevronRight className="h-4 w-4" />}
                        {item.href && !item.active ? (
                            <Link
                                href={item.href}
                                className="hover:text-[var(--text-primary)] transition-colors flex items-center"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className={cn(
                                "font-medium truncate max-w-[200px]",
                                item.active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                            )}>
                                {item.label}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Title & Actions */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 animate-in fade-in slide-in-from-left-2 duration-500 delay-100">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                        {title}
                    </h1>
                    {(subtitle || description) && (
                        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                            {subtitle ?? description}
                        </div>
                    )}
                </div>

                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
