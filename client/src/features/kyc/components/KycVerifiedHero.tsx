/**
 * KycVerifiedHero - Verified Seller Hero
 *
 * Celebration + command center for KYC-verified sellers.
 * Uses WalletHero-style gradient, orbs, and actionable CTAs.
 */

'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    ShieldCheck,
    FileText,
    Landmark,
    Building2,
    Package,
    Truck,
    BarChart3,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { cn } from '@/src/lib/utils';
import type { KYCData, KycSnapshot, VerifiedKycData } from '@/src/core/api/clients/auth/kycApi';
import { format } from 'date-fns';
import { getDefaultRedirectForUser, type UserForRedirect } from '@/src/config/redirect';

export interface KycVerifiedHeroProps {
    kyc: KYCData;
    snapshot?: KycSnapshot;
    verifiedData?: VerifiedKycData;
    user?: UserForRedirect | null;
}

function getEarliestVerifiedAt(snapshot?: KycSnapshot): string | null {
    if (!snapshot) return null;
    const dates: (string | null | undefined)[] = [
        snapshot.pan?.verifiedAt,
        snapshot.bankAccount?.verifiedAt,
        snapshot.gstin?.verifiedAt,
    ].filter(Boolean);
    if (dates.length === 0) return null;
    const parsed = dates
        .map((d) => (d ? new Date(d).getTime() : Infinity))
        .filter((t) => t !== Infinity);
    if (parsed.length === 0) return null;
    return new Date(Math.min(...parsed)).toISOString();
}

export function KycVerifiedHero({ kyc, snapshot, verifiedData, user }: KycVerifiedHeroProps) {
    const router = useRouter();
    const userName = verifiedData?.pan?.name?.trim();
    const hasPan = snapshot?.pan?.state === 'verified';
    const hasBank = snapshot?.bankAccount?.state === 'verified';
    const hasGstin = snapshot?.gstin?.state === 'verified';
    const verifiedSince = getEarliestVerifiedAt(snapshot) ?? kyc.updatedAt ?? kyc.createdAt;

    const headline = userName ? `You're verified, ${userName}!` : "You're all set!";
    const subhead =
        "Your identity and bank details are verified. You can ship with confidence.";

    const trustBadges = [
        hasPan && { label: 'PAN Verified', icon: FileText },
        hasBank && { label: 'Bank Linked', icon: Landmark },
        hasGstin && { label: 'GSTIN Verified', icon: Building2 },
    ].filter(Boolean) as { label: string; icon: typeof FileText }[];

    const quickActions = [
        { label: 'Create Order', href: '/seller/orders/create', icon: Package },
        { label: 'Book Shipment', href: '/seller/orders', icon: Truck },
        { label: 'View Rates', href: '/seller/rates', icon: BarChart3 },
    ];

    const handleDashboard = () => {
        router.push(getDefaultRedirectForUser(user) || '/seller/dashboard');
    };

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="KYC Verification"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'KYC', active: true },
                ]}
                description="Your identity verification status"
                showBack={false}
            />

            {/* Hero Card - WalletHero-style gradient + orbs */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className={cn(
                    'relative overflow-hidden rounded-[var(--radius-2xl)] p-6 sm:p-8',
                    'bg-gradient-to-br from-[var(--wallet-hero-from)] via-[var(--wallet-hero-via)] to-[var(--wallet-hero-to)]',
                    'border border-[var(--wallet-hero-border)]'
                )}
            >
                {/* Gradient orbs */}
                <div className="absolute -top-20 -right-20 w-72 h-72 sm:w-80 sm:h-80 bg-[var(--primary-blue)]/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 -left-24 w-48 h-48 sm:w-56 sm:h-56 bg-[var(--info)]/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 right-1/3 w-40 h-40 sm:w-48 sm:h-48 bg-[var(--wallet-hero-orb-pink)] rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-6">
                    {/* Header: Icon + Headline (with accent bar) */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 border-l-4 border-[var(--primary-blue)] pl-4 sm:pl-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center bg-[var(--success-bg)] border-2 border-[var(--success)]/20 shrink-0"
                        >
                            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--success)]" />
                        </motion.div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                                {headline}
                            </h2>
                            <p className="text-[var(--text-secondary)] mt-1 text-sm sm:text-base">
                                {subhead}
                            </p>
                        </div>
                    </div>

                    {/* Trust badges */}
                    {trustBadges.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex flex-wrap gap-2"
                        >
                            {trustBadges.map((badge, idx) => {
                                const Icon = badge.icon;
                                return (
                                    <Badge
                                        key={badge.label}
                                        variant="success"
                                        size="md"
                                        className="gap-1.5 px-3 py-1.5"
                                    >
                                        <Icon className="w-4 h-4" />
                                        {badge.label}
                                    </Badge>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* Quick actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col sm:flex-row gap-3"
                    >
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <Button
                                    key={action.label}
                                    onClick={() => router.push(action.href)}
                                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-12 px-6"
                                >
                                    <Icon className="w-5 h-5" />
                                    {action.label}
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            );
                        })}
                    </motion.div>

                    {/* Footer: Verified since + Dashboard */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-[var(--wallet-hero-border)]"
                    >
                        {verifiedSince && (
                            <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                                Verified since {format(new Date(verifiedSince), 'd MMM yyyy')}
                            </p>
                        )}
                        <Button
                            variant="outline"
                            onClick={handleDashboard}
                            className="sm:ml-auto border-[var(--wallet-hero-card-border)] bg-[var(--wallet-hero-card)] hover:bg-[var(--wallet-hero-card-hover)]"
                        >
                            Go to Dashboard
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
