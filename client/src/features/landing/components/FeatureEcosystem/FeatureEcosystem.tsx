"use client"

import { motion, useMotionValue, useTransform } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Network, BarChart2, Map, Package, Layers, CreditCard, Bell, Printer, Puzzle, LayoutDashboard, Truck, ArrowRight, Zap } from "lucide-react"
import Image from "next/image"

// Redesigned: Flat & Clean Aesthetic
function FeatureShowcase({ feature, index, inView }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.05, duration: 0.6 }}
            className="group flex flex-col p-8 rounded-2xl bg-secondary hover:bg-white transition-colors duration-200"
        >
            {/* Context Icon */}
            <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primaryBlue/5 text-primaryBlue group-hover:bg-primaryBlue group-hover:text-white transition-colors duration-200">
                <feature.icon size={24} strokeWidth={1.5} />
            </div>

            {/* Typography Content */}
            <div className="flex-1 space-y-4">
                <h3 className="text-xl font-bold text-charcoal-900 tracking-tight">
                    {feature.title}
                </h3>
                <p className="text-sm text-charcoal-600 leading-relaxed">
                    {feature.description}
                </p>
            </div>

            {/* Metric/Footer */}
            <div className="mt-8 pt-6 border-t border-charcoal-100 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primaryBlue tabular-nums tracking-tight">
                    {feature.stats.count}
                </span>
                <span className="text-xs font-semibold text-charcoal-400 uppercase tracking-wide">
                    {feature.stats.label}
                </span>
            </div>
        </motion.div>
    )
}

export default function FeatureEcosystem() {
    const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })

    const features = [
        {
            title: "Multi-Courier Network",
            description: "Access 15+ courier partners instantly via a unified API. No separate contracts required.",
            icon: Network,
            stats: { count: "15+", label: "Partners" }
        },
        {
            title: "AI Rate Optimization",
            description: "Intelligent routing engine selects the best carrier for every shipment based on SLA and cost.",
            icon: BarChart2,
            stats: { count: "25%", label: "Savings" }
        },
        {
            title: "Real-Time Tracking",
            description: "Proactive status updates via SMS & Email. Branded tracking pages for superior CX.",
            icon: Map,
            stats: { count: "70%", label: "Fewer Calls" }
        },
        {
            title: "Warehouse Logic",
            description: "Automated label generation and manifest creation. Streamline picking and packing.",
            icon: Package,
            stats: { count: "5x", label: "Efficient" }
        },
        {
            title: "Bulk Operations",
            description: "CSV upload and bulk processing for high-volume days. Handle thousands of orders in minutes.",
            icon: Layers,
            stats: { count: "500+", label: "Orders/Min" }
        },
        {
            title: "COD Reconciliation",
            description: "Automated payment tracking and remittance cycles. precise cash flow visibility.",
            icon: CreditCard,
            stats: { count: "100%", label: "Accurate" }
        },
        {
            title: "Smart Alerts",
            description: "Exception management system. Get notified only when shipments are delayed or stuck.",
            icon: Bell,
            stats: { count: "Instant", label: "Updates" }
        },
        {
            title: "Label Generation",
            description: "One-click bulk label printing. Auto-formats for all major courier standards.",
            icon: Printer,
            stats: { count: "0.2s", label: "Gen Time" }
        },
        {
            title: "API Integrations",
            description: "Plugins for Shopify, WooCommerce, and Magento. Custom REST API for enterprise.",
            icon: Puzzle,
            stats: { count: "10+", label: "Plugins" }
        }
    ]

    return (
        <section className="py-24 md:py-32 bg-white relative">
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Minimal Header */}
                <div className="mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        className="max-w-2xl"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-charcoal-900 mb-6 tracking-tight">
                            Complete Logistics Stack
                        </h2>
                        <p className="text-lg text-charcoal-500 max-w-xl">
                            Everything you need to ship, track, and manage orders. One platform, zero bloat.
                        </p>
                    </motion.div>
                </div>

                {/* Flat Grid Layout */}
                <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                    {features.map((feature, i) => (
                        <FeatureShowcase key={i} feature={feature} index={i} inView={inView} />
                    ))}
                </div>
            </div>
        </section>
    )
}
