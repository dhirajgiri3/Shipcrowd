"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, ChevronDown, Zap } from "lucide-react"
import { Button } from '@/src/components/ui/core/Button'

export default function Pricing() {
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
    const [isComparisonOpen, setIsComparisonOpen] = useState(false)

    const plans = [
        {
            name: "Starter",
            description: "Perfect for new businesses just getting started.",
            price: { monthly: "₹0", annual: "₹0" },
            features: ["50 Shipments/month", "Standard Support", "Basic Analytics", "3 Courier Partners"],
            cta: "Start Free",
            popular: false
        },
        {
            name: "Growth",
            description: "For scaling businesses that need more power.",
            price: { monthly: "₹1,999", annual: "₹1,599" },
            features: ["500 Shipments/month", "Priority Support", "Advanced Analytics", "All 15+ Couriers", "Branded Tracking"],
            cta: "Get Started",
            popular: true
        },
        {
            name: "Enterprise",
            description: "Custom solutions for high-volume sellers.",
            price: { monthly: "Custom", annual: "Custom" },
            features: ["Unlimited Shipments", "Dedicated Account Manager", "Custom API Integration", "SLA Guarantees"],
            cta: "Contact Sales",
            popular: false
        }
    ]

    return (
        <section className="py-24 md:py-32 bg-white" id="pricing">
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Header */}
                <div className="text-center max-w-[800px] mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2.5 mb-6"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-primaryBlue" />
                        <span className="text-charcoal-600 text-sm font-medium tracking-wide">
                            Simple, Transparent Pricing
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-bold text-charcoal-950 mb-6 leading-tight"
                    >
                        Pay for What You Need.<br />
                        <span className="text-primaryBlue">Nothing More.</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-charcoal-600 mb-8"
                    >
                        All plans include unlimited users and free setup. No hidden fees.
                    </motion.p>

                    {/* Toggle */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="inline-flex items-center p-1.5 bg-gray-100 rounded-full relative border border-gray-200"
                    >
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${billingCycle === "monthly"
                                ? "text-white bg-primaryBlue shadow-md"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle("annual")}
                            className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${billingCycle === "annual"
                                ? "text-white bg-primaryBlue shadow-md"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Annual
                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                                Save 20%
                            </span>
                        </button>
                    </motion.div>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 items-start mb-20">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative p-8 rounded-3xl transition-all duration-500 ${plan.popular
                                ? "bg-gradient-to-br from-primaryBlue to-indigo-600 text-white shadow-2xl shadow-primaryBlue/20 scale-105 md:scale-110 border-0"
                                : "bg-white text-gray-900 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-gray-200"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg border border-white/20">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold mb-2 tracking-tight">{plan.name}</h3>
                                <p className={`text-sm font-medium ${plan.popular ? "text-white/80" : "text-gray-500"}`}>
                                    {plan.description}
                                </p>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={billingCycle}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="text-5xl font-bold tracking-tight"
                                        >
                                            {plan.price[billingCycle]}
                                        </motion.span>
                                    </AnimatePresence>
                                    {plan.price.monthly !== "Custom" && (
                                        <span className={`text-sm font-medium ${plan.popular ? "text-white/70" : "text-gray-500"}`}>
                                            /month
                                        </span>
                                    )}
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm font-medium">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.popular
                                            ? "bg-white/20 text-white"
                                            : "bg-primaryBlue/10 text-primaryBlue"
                                            }`}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button
                                className={`w-full h-12 text-base font-semibold rounded-xl transition-all duration-300 ${plan.popular
                                    ? "bg-white text-primaryBlue hover:bg-white/90 shadow-lg"
                                    : "bg-primaryBlue text-white hover:bg-primaryBlue/90 shadow-lg shadow-primaryBlue/20"
                                    }`}
                            >
                                {plan.cta}
                            </Button>
                        </motion.div>
                    ))}
                </div>

                {/* Feature Comparison Toggle */}
                <div className="max-w-[1000px] mx-auto">
                    <motion.button
                        onClick={() => setIsComparisonOpen(!isComparisonOpen)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 text-charcoal-600 font-semibold hover:text-primaryBlue transition-colors mb-6 py-3"
                    >
                        Compare all features
                        <ChevronDown
                            className={`w-5 h-5 transition-transform duration-300 ${isComparisonOpen ? "rotate-180" : ""
                                }`}
                        />
                    </motion.button>

                    <motion.div
                        initial={false}
                        animate={{
                            height: isComparisonOpen ? "auto" : 0,
                            opacity: isComparisonOpen ? 1 : 0
                        }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="border border-charcoal-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="grid grid-cols-4 bg-charcoal-50 p-4 font-bold text-sm text-charcoal-900">
                                <div className="pl-4">Feature</div>
                                <div className="text-center">Starter</div>
                                <div className="text-center text-primaryBlue">Growth</div>
                                <div className="text-center">Enterprise</div>
                            </div>
                            {/* Comparison Rows */}
                            {[
                                { name: "Shipments", s: "50", g: "500", e: "Unlimited" },
                                { name: "Couriers", s: "3", g: "15+", e: "Custom" },
                                { name: "Tracking Page", s: "Standard", g: "Branded", e: "Custom Domain" },
                                { name: "API Access", s: false, g: true, e: true },
                                { name: "Support", s: "Email", g: "Priority", e: "Dedicated Mgr" },
                            ].map((row, i) => (
                                <div
                                    key={i}
                                    className="grid grid-cols-4 p-4 border-t border-charcoal-100 text-sm hover:bg-charcoal-50 transition-colors"
                                >
                                    <div className="pl-4 font-medium text-charcoal-900">{row.name}</div>
                                    <div className="text-center text-charcoal-600">
                                        {typeof row.s === "boolean" ? (
                                            row.s ? (
                                                <Check className="mx-auto text-emerald w-5" />
                                            ) : (
                                                <X className="mx-auto text-charcoal-300 w-5" />
                                            )
                                        ) : (
                                            row.s
                                        )}
                                    </div>
                                    <div className="text-center font-semibold text-primaryBlue bg-primaryBlue/5 -my-4 py-4">
                                        {typeof row.g === "boolean" ? (
                                            row.g ? (
                                                <Check className="mx-auto text-emerald w-5" />
                                            ) : (
                                                <X className="mx-auto text-charcoal-300 w-5" />
                                            )
                                        ) : (
                                            row.g
                                        )}
                                    </div>
                                    <div className="text-center text-charcoal-600">
                                        {typeof row.e === "boolean" ? (
                                            row.e ? (
                                                <Check className="mx-auto text-emerald w-5" />
                                            ) : (
                                                <X className="mx-auto text-charcoal-300 w-5" />
                                            )
                                        ) : (
                                            row.e
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
