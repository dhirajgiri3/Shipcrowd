"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Network, BarChart2, Map, Package, Layers, CreditCard, Bell, Printer, Puzzle, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

export default function FeatureEcosystem() {
    const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })

    const features = [
        {
            title: "Multi-Courier Network",
            description: "Access 15+ courier partners instantly. No individual negotiations needed.",
            icon: Network,
            size: "large", // 6 cols
            visual: "network"
        },
        {
            title: "AI Rate Comparison",
            description: "Automatically select the cheapest or fastest courier for every shipment.",
            icon: BarChart2,
            size: "medium", // 4 cols
            visual: "comparison"
        },
        {
            title: "Real-Time Tracking",
            description: "Live updates for you and your customers on a branded tracking page.",
            icon: Map,
            size: "large", // 6 cols
            visual: "map"
        },
        {
            title: "Warehouse Automation",
            description: "Streamline picking, packing, and label generation.",
            icon: Package,
            size: "medium", // 4 cols
            visual: "warehouse"
        },
        {
            title: "Bulk Operations",
            description: "Process 500+ orders in one click via CSV.",
            icon: Layers,
            size: "small", // 3 cols
            visual: "bulk"
        },
        {
            title: "COD Management",
            description: "Automated COD remittance and reconciliation cycles.",
            icon: CreditCard,
            size: "large", // 6 cols
            visual: "cod"
        },
        {
            title: "Smart Alerts",
            description: "Instant notifications for delays or exceptions.",
            icon: Bell,
            size: "medium", // 4 cols
            visual: "alerts"
        },
        {
            title: "Label Generation",
            description: "Print shipping labels in bulk instantly.",
            icon: Printer,
            size: "small", // 3 cols
            visual: "printer"
        },
        {
            title: "Custom Integrations",
            description: "Connect with Shopify, WooCommerce, and more.",
            icon: Puzzle,
            size: "medium", // 4 cols
            visual: "integrations"
        },
        {
            title: "Analytics Dashboard",
            description: "Deep insights into your shipping performance.",
            icon: LayoutDashboard,
            size: "medium", // 4 cols
            visual: "dashboard"
        }
    ]

    return (
        <section className="py-32 bg-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primaryBlue/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                {/* Header */}
                <div className="grid lg:grid-cols-[60%_40%] gap-12 mb-20 items-end">
                    <div>
                        <div className="text-[13px] font-bold text-primaryBlue tracking-widest uppercase mb-4">
                            Complete Platform
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-charcoal-950 leading-tight">
                            Everything You Need.<br />Nothing You Don't.
                        </h2>
                    </div>
                    <p className="text-lg text-charcoal-600 lg:text-right max-w-[400px] lg:ml-auto">
                        One platform. Unlimited couriers. AI-powered intelligence. Complete control over your logistics.
                    </p>
                </div>

                {/* Bento Grid */}
                <div ref={ref} className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
                    {features.map((feature, i) => (
                        <BentoCard key={i} feature={feature} index={i} inView={inView} />
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <button className="inline-flex items-center justify-center px-8 py-3 rounded-full border-2 border-primaryBlue text-primaryBlue font-semibold hover:bg-primaryBlue hover:text-white transition-colors duration-300">
                        View all features →
                    </button>
                </div>
            </div>
        </section>
    )
}

function BentoCard({ feature, index, inView }: any) {
    const getSizeClasses = (size: string) => {
        switch (size) {
            case "large": return "md:col-span-3 lg:col-span-6 row-span-2"
            case "medium": return "md:col-span-3 lg:col-span-4 row-span-2"
            case "small": return "md:col-span-2 lg:col-span-3 row-span-1"
            default: return "col-span-3"
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ delay: index * 0.05, duration: 0.5 }}
            whileHover={{ y: -8, borderColor: 'rgba(37,37,255,0.4)', boxShadow: '0 24px 48px rgba(0,0,0,0.08)' }}
            className={cn(
                "bg-white border border-charcoal-200 rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 shadow-sm group overflow-hidden relative",
                getSizeClasses(feature.size)
            )}
        >
            <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primaryBlue/5 flex items-center justify-center text-primaryBlue mb-6 group-hover:bg-primaryBlue group-hover:text-white transition-colors duration-300">
                    <feature.icon size={24} />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-charcoal-950 mb-3">
                    {feature.title}
                </h3>
                <p className="text-charcoal-600 text-sm md:text-base leading-relaxed">
                    {feature.description}
                </p>
            </div>

            {/* Visual Placeholder - Custom per feature type */}
            <div className="mt-8 relative h-32 md:h-40 bg-charcoal-50 rounded-xl overflow-hidden border border-charcoal-100 group-hover:border-primaryBlue/20 transition-colors">
                {/* Abstract visual representation */}
                <div className="absolute inset-0 flex items-center justify-center text-charcoal-300">
                    {/* Add specific mini-visuals here if needed, for now using abstract patterns */}
                    <div className="w-full h-full opacity-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]" />
                </div>
            </div>
        </motion.div>
    )
}
