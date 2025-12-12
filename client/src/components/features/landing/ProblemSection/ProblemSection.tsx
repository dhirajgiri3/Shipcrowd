"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { LayoutDashboard, FileSpreadsheet, BarChart2, MessageSquare, ArrowRight } from "lucide-react"
import Image from "next/image"

export default function ProblemSection() {
    const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })

    const problems = [
        {
            title: "Juggling 5+ Courier Dashboards?",
            description: "Logging into BlueDart, Delhivery, and DTDC separately just to track orders? It's chaos.",
            icon: LayoutDashboard,
            image: "/images/problem-section/problem_juggling_dashboards.png",
            accent: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            title: "Manual Excel Entry Errors?",
            description: "One typo in a pincode can cause a failed delivery. Spreadsheets aren't scalable.",
            icon: FileSpreadsheet,
            image: "/images/problem-section/problem_manual_entry.png",
            accent: "text-amber-500",
            bg: "bg-amber-50"
        },
        {
            title: "Flying Blind on Analytics?",
            description: "Don't know which courier is fastest or cheapest? You're losing money on every shipment.",
            icon: BarChart2,
            image: "/images/problem-section/problem_no_analytics.png",
            accent: "text-red-500",
            bg: "bg-red-50"
        },
        {
            title: "Customer Support Overload?",
            description: "\"Where is my order?\" calls eating up your day? WISMO tickets are killing productivity.",
            icon: MessageSquare,
            image: "/images/problem-section/problem_support_overload.png",
            accent: "text-purple-500",
            bg: "bg-purple-50"
        }
    ]

    return (
        <section className="py-24 md:py-32 bg-white relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-charcoal-50 to-white -z-10" />
            <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-primaryBlue/[0.02] rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Header */}
                <div className="text-center max-w-[800px] mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2.5 mb-6 px-4 py-2 bg-rose/5 rounded-full border border-rose/10"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-rose" />
                        <span className="text-rose text-sm font-bold tracking-wide uppercase">
                            The Current Reality
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold text-charcoal-950 mb-6 leading-tight"
                    >
                        Shipping Logistics shouldn't feel like <span className="text-rose decoration-4 underline decoration-rose/20">fighting a fire.</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-charcoal-600 leading-relaxed"
                    >
                        Most e-commerce brands lose 20% of their operational time just managing logistics manually.
                    </motion.p>
                </div>

                {/* Problem Grid */}
                <div ref={ref} className="grid md:grid-cols-2 gap-8 md:gap-12">
                    {problems.map((problem, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="bg-white border border-charcoal-100 rounded-3xl overflow-hidden hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] hover:border-charcoal-200 transition-all duration-500 group flex flex-col items-center text-center p-8"
                        >
                            {/* Image Visual */}
                            <div className="w-full h-[220px] md:h-[280px] relative mb-8 group-hover:scale-105 transition-transform duration-700">
                                <Image
                                    src={problem.image}
                                    alt={problem.title}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                            </div>

                            {/* Content */}
                            <div className="space-y-4 max-w-[400px]">
                                <div className={`inline-flex p-3 rounded-2xl ${problem.bg} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                                    <problem.icon className={`w-6 h-6 ${problem.accent}`} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-2xl font-bold text-charcoal-900 group-hover:text-primaryBlue transition-colors duration-300">
                                    {problem.title}
                                </h3>
                                <p className="text-charcoal-600 leading-relaxed">
                                    {problem.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
