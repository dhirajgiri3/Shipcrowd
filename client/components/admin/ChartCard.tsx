"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface ChartCardProps {
    title: string;
    children: React.ReactElement; // Requires Recharts component as child
    height?: number;
    className?: string;
    action?: React.ReactNode;
}

export function ChartCard({ title, children, height = 300, className, action }: ChartCardProps) {
    return (
        <Card className={cn('flex flex-col overflow-hidden', className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-gray-900">{title}</CardTitle>
                {action && <div>{action}</div>}
            </CardHeader>
            <CardContent className="flex-1 min-h-0 relative">
                <div className="w-full" style={{ height: height, minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        {children}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
