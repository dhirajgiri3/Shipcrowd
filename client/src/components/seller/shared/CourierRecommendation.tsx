"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    Truck,
    TrendingUp,
    Clock,
    DollarSign,
    Star,
    AlertCircle,
    CheckCircle2,
    Info
} from "lucide-react";
import { Badge } from '@/src/components/ui/core/Badge';
import { cn } from "@/src/lib/utils";
import { useCourierRecommendations } from '@/src/core/api/hooks/useCourierRecommendation';

interface CourierOption {
    id: string;
    name: string;
    logo?: string;
    estimatedDelivery: string;
    price: number;
    rating: number;
    onTimeRate: number;
    recommended: boolean;
    features: string[];
    riskLevel?: 'low' | 'medium' | 'high';
}

interface CourierRecommendationProps {
    pickupPincode: string;
    deliveryPincode: string;
    weight: number;
    paymentMode: 'cod' | 'prepaid';
    onSelect?: (courier: CourierOption) => void;
    selectedCourierId?: string;
}

export function CourierRecommendation({
    pickupPincode,
    deliveryPincode,
    weight,
    paymentMode,
    onSelect,
    selectedCourierId,
}: CourierRecommendationProps) {
    // Build request parameters
    const request = useMemo(() => {
        if (!pickupPincode || !deliveryPincode || !weight) return null;
        return {
            pickupPincode,
            deliveryPincode,
            weight,
            paymentMode,
        };
    }, [pickupPincode, deliveryPincode, weight, paymentMode]);

    // Fetch recommendations
    const { data, isLoading: loading, error } = useCourierRecommendations(request);

    const couriers = data?.recommendations || [];

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                    <Truck className="h-5 w-5 text-[var(--primary-blue)]" />
                    <h3 className="font-semibold text-[var(--text-primary)]">
                        Selecting Best Courier...
                    </h3>
                </div>
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-32 bg-[var(--bg-tertiary)] rounded-xl animate-pulse"
                        style={{ animationDelay: `${i * 100}ms` }}
                    />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50">
                <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-semibold text-rose-700 dark:text-rose-300">
                            Failed to load courier recommendations
                        </h3>
                        <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
                            Please check your pickup and delivery pincodes and try again.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (couriers.length === 0) {
        return (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-semibold text-amber-700 dark:text-amber-300">
                            No couriers available
                        </h3>
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                            No courier services available for this route. Please check the pincodes.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const recommendedCourier = couriers.find(c => c.recommended);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-[var(--primary-blue)]" />
                    <h3 className="font-semibold text-[var(--text-primary)]">
                        Recommended Couriers
                    </h3>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                    {pickupPincode} → {deliveryPincode} • {weight}kg
                </div>
            </div>

            {/* Recommendation Notice */}
            {recommendedCourier && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50">
                    <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Based on delivery zone, payment mode, and performance, we recommend <strong>{recommendedCourier.name}</strong> for this shipment.
                        </p>
                    </div>
                </div>
            )}

            {/* Courier Options */}
            <div className="space-y-3">
                {couriers.map((courier, index) => {
                    const isSelected = courier.id === selectedCourierId;
                    const isRecommended = courier.recommended;

                    return (
                        <motion.button
                            key={courier.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => onSelect?.(courier)}
                            className={cn(
                                "w-full p-4 rounded-2xl border transition-all duration-200 text-left group",
                                isSelected
                                    ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/20 shadow-lg shadow-blue-500/10"
                                    : isRecommended
                                        ? "border-[var(--primary-blue)]/30 bg-[var(--primary-blue-soft)]/5 hover:border-[var(--primary-blue)]/50 hover:shadow-md"
                                        : "border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:shadow-md"
                            )}
                        >
                            <div className="flex items-start justify-between gap-4">
                                {/* Left: Courier Info */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-12 w-12 rounded-xl flex items-center justify-center",
                                            isSelected
                                                ? "bg-[var(--primary-blue)] text-white"
                                                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                                        )}>
                                            <Truck className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className={cn(
                                                    "font-semibold",
                                                    isSelected
                                                        ? "text-[var(--primary-blue)]"
                                                        : "text-[var(--text-primary)]"
                                                )}>
                                                    {courier.name}
                                                </h4>
                                                {isRecommended && (
                                                    <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px]">
                                                        <Star className="h-3 w-3 mr-1 fill-current" />
                                                        Recommended
                                                    </Badge>
                                                )}
                                                {isSelected && (
                                                    <CheckCircle2 className="h-5 w-5 text-[var(--primary-blue)]" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                    {courier.rating.toFixed(1)}
                                                </span>
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    {courier.onTimeRate}% on-time
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <div className="flex flex-wrap gap-2">
                                        {courier.features.map((feature) => (
                                            <span
                                                key={feature}
                                                className="px-2 py-1 text-[10px] rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-medium"
                                            >
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: Price & Delivery */}
                                <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1 justify-end mb-2">
                                        <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        <span className={cn(
                                            "text-2xl font-bold",
                                            isSelected
                                                ? "text-[var(--primary-blue)]"
                                                : "text-[var(--text-primary)]"
                                        )}>
                                            ₹{courier.price}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)] mb-2">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{courier.estimatedDelivery}</span>
                                    </div>
                                    {courier.riskLevel && (
                                        <Badge className={cn(
                                            "text-[10px]",
                                            courier.riskLevel === 'low'
                                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                                : courier.riskLevel === 'medium'
                                                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                                    : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                                        )}>
                                            {courier.riskLevel.toUpperCase()} RISK
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Savings Notice */}
            {couriers.length > 1 && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
                    <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            Choosing the most cost-effective option saves you{' '}
                            <strong>₹{Math.max(...couriers.map(c => c.price)) - Math.min(...couriers.map(c => c.price))}</strong>{' '}
                            on this shipment.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CourierRecommendation;
