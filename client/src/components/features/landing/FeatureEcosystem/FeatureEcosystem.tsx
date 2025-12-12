"use client"

import { motion, useMotionValue, useTransform } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Network, BarChart2, Map, Package, Layers, CreditCard, Bell, Printer, Puzzle, LayoutDashboard, Truck, ArrowRight, Zap } from "lucide-react"
import Image from "next/image"

export default function FeatureEcosystem() {
    const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })

    const features = [
        {
            title: "Multi-Courier Network",
            description: "Access 15+ courier partners instantly through a single unified platform. No individual negotiations, no separate contracts—just seamless integration with India's top logistics providers.",
            icon: Network,
            image: "/images/feature_network.png",
            stats: { count: "15+", label: "Courier Partners" }
        },
        {
            title: "AI Rate Comparison",
            description: "Our intelligent engine analyzes rates across all carriers in real-time, automatically selecting the most cost-effective option for each shipment while maintaining delivery speed.",
            icon: BarChart2,
            image: "/images/feature_rate_comparison.png",
            stats: { count: "25%", label: "Average Savings" }
        },
        {
            title: "Real-Time Tracking",
            description: "Give your customers complete visibility with branded tracking pages that update in real-time. Reduce WISMO calls by 70% with proactive status updates.",
            icon: Map,
            image: "/images/feature_tracking.png",
            stats: { count: "70%", label: "Fewer Support Tickets" }
        },
        {
            title: "Warehouse Automation",
            description: "Streamline your fulfillment operations with intelligent picking, packing, and label generation. Reduce processing time from hours to minutes.",
            icon: Package,
            image: "/images/feature_warehouse.png",
            stats: { count: "5x", label: "Faster Processing" }
        },
        {
            title: "Bulk Operations",
            description: "Process hundreds of orders in seconds with our powerful CSV upload and bulk processing tools. Perfect for flash sales and high-volume periods.",
            icon: Layers,
            image: "/images/feature_bulk_ops.png",
            stats: { count: "500+", label: "Orders/Minute" }
        },
        {
            title: "COD Management",
            description: "Automated COD remittance tracking and reconciliation with real-time updates. Never miss a payment cycle or lose track of your cash flow.",
            icon: CreditCard,
            image: "/images/feature_cod.png",
            stats: { count: "100%", label: "Reconciliation" }
        },
        {
            title: "Smart Alerts",
            description: "Stay informed with intelligent notifications for delays, exceptions, and delivery updates. Get alerts only when action is needed.",
            icon: Bell,
            image: "/images/feature_smart_alerts.png",
            stats: { count: "Real-time", label: "Notifications" }
        },
        {
            title: "Label Generation",
            description: "Generate and print shipping labels in bulk with one click. Support for all major couriers with automatic format detection.",
            icon: Printer,
            image: "/images/feature_label_gen.png",
            stats: { count: "Instant", label: "Label Printing" }
        },
        {
            title: "Platform Integrations",
            description: "Seamlessly connect with Shopify, WooCommerce, Magento, and custom solutions. Our API supports any e-commerce platform.",
            icon: Puzzle,
            image: "/images/feature_integrations.png",
            stats: { count: "10+", label: "Integrations" }
        },
        {
            title: "Advanced Analytics",
            description: "Deep insights into shipping performance, cost analysis, carrier efficiency, and delivery trends. Make data-driven decisions confidently.",
            icon: LayoutDashboard,
            image: "/images/feature_analytics.png",
            stats: { count: "50+", label: "Metrics Tracked" }
        }
    ]

    return (
        <section className="py-20 md:py-32 bg-white relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primaryBlue/[0.02] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primaryBlue/[0.02] rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                {/* Header */}
                <div className="text-center max-w-[900px] mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2.5 mb-6"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-primaryBlue" />
                        <span className="text-charcoal-600 text-sm font-medium tracking-wide">
                            Complete Feature Set
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-bold text-charcoal-950 mb-6 leading-tight"
                    >
                        Everything You Need.<br />
                        <span className="text-primaryBlue">Nothing You Don't.</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg md:text-xl text-charcoal-600 leading-relaxed max-w-[700px] mx-auto"
                    >
                        One unified platform. Unlimited couriers. AI-powered intelligence. Complete control over your logistics operations.
                    </motion.p>
                </div>

                {/* Feature Showcase - Alternating Layout */}
                <div ref={ref} className="space-y-32">
                    {features.map((feature, i) => (
                        <FeatureShowcase key={i} feature={feature} index={i} inView={inView} reverse={i % 2 !== 0} />
                    ))}
                </div>
            </div>
        </section>
    )
}

function FeatureShowcase({ feature, index, inView, reverse }: any) {
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const rotateX = useTransform(y, [-100, 100], [5, -5])
    const rotateY = useTransform(x, [-100, 100], [-5, 5])

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        const xPct = mouseX / width - 0.5
        const yPct = mouseY / height - 0.5
        x.set(xPct * 200)
        y.set(yPct * 200)
    }

    function handleMouseLeave() {
        x.set(0)
        y.set(0)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={`flex flex-col lg:flex-row items-center gap-12 md:gap-20 ${reverse ? 'lg:flex-row-reverse' : ''}`}
        >
            {/* Content Side */}
            <div className="flex-1 space-y-8 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-charcoal-50 rounded-full border border-charcoal-100">
                    <feature.icon size={14} className="text-charcoal-600" />
                    <span className="text-xs font-bold text-charcoal-600 uppercase tracking-wider">{feature.title}</span>
                </div>

                <h3 className="text-3xl md:text-5xl font-bold text-charcoal-950 leading-tight">
                    {feature.title}
                </h3>

                <p className="text-lg text-charcoal-600 leading-relaxed">
                    {feature.description}
                </p>

                <div className="flex items-center gap-8 pt-4 border-t border-charcoal-100">
                    <div>
                        <div className="text-3xl font-bold text-primaryBlue">{feature.stats.count}</div>
                        <div className="text-xs font-bold text-charcoal-400 uppercase tracking-wider">{feature.stats.label}</div>
                    </div>
                </div>
            </div>

            {/* Visual Side with 3D Parallax */}
            <div className="flex-1 w-full perspective-1000">
                <motion.div
                    style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="relative w-full aspect-[4/3] rounded-3xl bg-white border border-charcoal-100 shadow-2xl transition-all duration-200 ease-linear cursor-grab active:cursor-grabbing group"
                >
                    {/* Floating Elements / Depth Layers */}
                    <motion.div
                        style={{ translateZ: 50 }}
                        className="absolute inset-4 md:inset-8 bg-charcoal-50 rounded-2xl overflow-hidden shadow-inner border border-charcoal-100/50"
                    >
                        {feature.image && (
                            <Image
                                src={feature.image}
                                alt={feature.title}
                                fill
                                className="object-contain p-4 group-hover:scale-105 transition-transform duration-700"
                            />
                        )}
                    </motion.div>

                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />

                    {/* Shadow Layer */}
                    <div className="absolute -inset-4 bg-primaryBlue/20 blur-3xl -z-10 opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
                </motion.div>
            </div>
        </motion.div>
    )
}
