"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Clock, TrendingDown, AlertTriangle, MessageSquare } from "lucide-react"

export default function ProblemSection() {
    const painPoints = [
        {
            title: "Juggling 5+ Courier Dashboards Daily?",
            description: "Logging into multiple portals to check rates and track shipments is a recipe for chaos and errors.",
            stat: "Average time wasted: 2.5 hours per day",
            icon: Clock,
            visual: "chaos"
        },
        {
            title: "Copy. Paste. Repeat. 500 Times a Day.",
            description: "Manual data entry isn't just boring—it's expensive. One wrong digit can cost you a customer.",
            stat: "Manual processing costs: ₹45,000+ monthly",
            icon: TrendingDown,
            visual: "spreadsheet"
        },
        {
            title: "Flying Blind? You Can't Improve What You Can't See",
            description: "Without centralized analytics, you're guessing at shipping costs and performance metrics.",
            stat: "Businesses without analytics lose 15% revenue",
            icon: AlertTriangle,
            visual: "blind"
        },
        {
            title: "100+ Daily 'Where's My Order?' Messages",
            description: "Customer support drowning in WISMO tickets? It kills productivity and customer satisfaction.",
            stat: "Average response time: 4+ hours",
            icon: MessageSquare,
            visual: "support"
        }
    ]

    return (
        <section className="py-20 md:py-32 bg-charcoal-50">
            <div className="container mx-auto px-6 md:px-12 max-w-[1200px]">
                {/* Header */}
                <div className="text-center max-w-[800px] mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-[13px] font-bold text-primaryBlue tracking-widest uppercase mb-4"
                    >
                        The Shipping Struggle
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-5xl font-bold text-charcoal-950 mb-6 leading-tight"
                    >
                        Managing Logistics Shouldn't Feel Like Herding Cats
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-charcoal-700 leading-relaxed max-w-[700px] mx-auto"
                    >
                        You're not alone. Growing businesses waste 15+ hours weekly on manual shipping tasks, lose 8% revenue to shipping inefficiencies, and struggle with zero operational visibility.
                    </motion.p>
                </div>

                {/* Pain Points */}
                <div className="space-y-24">
                    {painPoints.map((point, i) => (
                        <PainPointCard key={i} point={point} index={i} />
                    ))}
                </div>

                {/* Transition */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mt-32 bg-white border-2 border-primaryBlue rounded-[20px] p-12 md:p-16 text-center shadow-blue-lg max-w-[900px] mx-auto relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <h3 className="text-2xl md:text-3xl font-semibold text-charcoal-950 mb-4">
                            Sound familiar? There's a better way.
                        </h3>
                        <p className="text-lg md:text-xl text-charcoal-700">
                            Imagine if AI handled all of this for you...
                        </p>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primaryBlue/5 to-transparent z-0" />
                </motion.div>
            </div>
        </section>
    )
}

function PainPointCard({ point, index }: { point: any, index: number }) {
    const { ref, inView } = useInView({ threshold: 0.4, triggerOnce: true })
    const isEven = index % 2 === 0

    return (
        <div ref={ref} className={`flex flex-col md:flex-row items-center gap-12 md:gap-16 ${isEven ? '' : 'md:flex-row-reverse'}`}>
            {/* Visual */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: isEven ? -5 : 5 }}
                animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-full md:w-[45%] aspect-square bg-white rounded-[20px] shadow-xl p-10 flex items-center justify-center border border-charcoal-100 relative overflow-hidden group hover:shadow-2xl transition-shadow duration-500"
            >
                <div className="absolute inset-0 bg-charcoal-50/50 group-hover:bg-transparent transition-colors duration-500" />
                {/* Placeholder for specific visual based on type */}
                <div className="relative z-10 text-charcoal-200">
                    <point.icon size={120} strokeWidth={1} />
                </div>
            </motion.div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, x: isEven ? 40 : -40 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="w-full md:w-[55%]"
            >
                <div className="w-12 h-12 rounded-full bg-primaryBlue/10 flex items-center justify-center mb-6 text-primaryBlue">
                    <point.icon size={24} />
                </div>
                <h3 className="text-2xl md:text-[32px] font-semibold text-charcoal-950 mb-4 leading-tight">
                    {point.title}
                </h3>
                <p className="text-lg text-charcoal-700 leading-relaxed mb-6 max-w-[540px]">
                    {point.description}
                </p>
                <div className="inline-flex items-center gap-3 px-5 py-3 bg-white border border-charcoal-200 rounded-lg shadow-sm">
                    <point.icon size={18} className="text-rose" />
                    <span className="font-medium text-[15px] text-charcoal-900">
                        {point.stat}
                    </span>
                </div>
            </motion.div>
        </div>
    )
}
