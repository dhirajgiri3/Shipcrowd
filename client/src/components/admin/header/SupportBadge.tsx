"use client";

import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminSupportMetrics } from '@/src/core/api/hooks/admin/support/useAdminSupportTickets';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';

export function SupportBadge() {
    const { data: metrics, isLoading } = useAdminSupportMetrics();

    // Calculate pending tickets (open + in_progress)
    console.log('[SupportBadge] metrics:', metrics);
    const pendingCount = metrics ? (metrics.openTickets || 0) + (metrics.inProgressTickets || 0) : 0;
    const hasPending = pendingCount > 0;

    return (
        <Link
            href="/admin/support"
            className="relative p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
            aria-label={`Support Tickets ${hasPending ? `(${pendingCount} pending)` : ''}`}
        >
            <LifeBuoy className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--primary-blue)] transition-colors" />

            <AnimatePresence>
                {hasPending && !isLoading && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--critical)] ring-2 ring-[var(--bg-primary)]"
                    >
                        <span className="sr-only">{pendingCount} pending tickets</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </Link>
    );
}
