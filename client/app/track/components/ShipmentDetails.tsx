'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, Scale, Ruler, Copy, Check } from 'lucide-react';

interface ShipmentDetailsProps {
    trackingNumber: string;
    carrier?: string;
    serviceType?: string;
    packageType?: string;
    weight?: string;
    dimensions?: string;
    className?: string;
}

export function ShipmentDetails({
    trackingNumber,
    carrier = 'Standard Carrier',
    serviceType = 'Standard Delivery',
    packageType = 'Package',
    weight,
    dimensions,
    className = '',
}: ShipmentDetailsProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(trackingNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Carrier Logo Mapping
    const getCarrierLogo = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('bluedart')) return '/logos/blue-dart.png';
        if (n.includes('fedex')) return '/logos/fedex.png';
        if (n.includes('dhl')) return '/logos/dhl.png';
        if (n.includes('delhivery')) return '/logos/delhivery.png';
        if (n.includes('shadowfax')) return '/logos/shadowfax.png';
        if (n.includes('xpressbees')) return '/logos/xpressbees.png';
        if (n.includes('ekart')) return '/logos/ekart.png';
        return null;
    };

    const carrierLogo = getCarrierLogo(carrier);

    const details = [
        {
            icon: <Truck className="w-4 h-4" />,
            label: 'Service',
            value: serviceType
        },
        ...(weight ? [{
            icon: <Scale className="w-4 h-4" />,
            label: 'Weight',
            value: weight
        }] : []),
        ...(dimensions ? [{
            icon: <Ruler className="w-4 h-4" />,
            label: 'Dimensions',
            value: dimensions
        }] : []),
    ];

    return (
        <motion.div
            className={`bg-[var(--bg-elevated)] rounded-[var(--radius-2xl)] p-5 md:p-6 border border-[var(--border-default)] ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    {carrierLogo ? (
                        <div className="h-12 w-36 relative flex items-center justify-start">
                            <img
                                src={carrierLogo}
                                alt={carrier}
                                className="h-full w-full object-contain object-left"
                            />
                        </div>
                    ) : (
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            Shipment Details
                        </h3>
                    )}
                </div>

                <button
                    onClick={handleCopy}
                    className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors duration-[var(--duration-base)]"
                >
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                        {trackingNumber}
                    </span>
                    {copied ? (
                        <Check className="w-3 h-3 text-[var(--success)]" />
                    ) : (
                        <Copy className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]" />
                    )}
                </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
                {details.map((detail, index) => (
                    <motion.div
                        key={detail.label}
                        className="flex items-start gap-2.5"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                    >
                        <div className="w-7 h-7 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] flex-shrink-0">
                            {detail.icon}
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] block">
                                {detail.label}
                            </span>
                            <span className="text-xs font-medium text-[var(--text-primary)] truncate block">
                                {detail.value}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Package Type Badge */}
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    <Package className="w-3 h-3" />
                    {packageType}
                </span>
            </div>
        </motion.div>
    );
}
