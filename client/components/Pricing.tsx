"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
        <section className="py-32 bg-white" id="pricing">
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Header */}
                <div className="text-center max-w-[800px] mx-auto mb-20">
                    <div className="text-[13px] font-bold text-primaryBlue tracking-widest uppercase mb-4">
                        Simple, Transparent Pricing
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-charcoal-950 mb-6 leading-tight">
                        Pay for What You Need.<br />Nothing More.
                    </h2>
                    <p className="text-lg text-charcoal-600 mb-10">
                        All plans include unlimited users and free setup. No hidden fees.
                    </p>

                    {/* Toggle */}
                    <div className="inline-flex items-center p-1 bg-charcoal-100 rounded-full relative">
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 relative z-10 ${billingCycle === "monthly" ? "text-charcoal-950 shadow-sm bg-white" : "text-charcoal-500 hover:text-charcoal-900"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle("annual")}
                            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 relative z-10 flex items-center gap-2 ${billingCycle === "annual" ? "text-charcoal-950 shadow-sm bg-white" : "text-charcoal-500 hover:text-charcoal-900"}`}
                        >
                            Annual
                            <Badge variant="success" className="text-[10px] px-1.5 py-0.5 h-auto">Save 20%</Badge>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 items-center mb-24">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative p-8 rounded-3xl border ${plan.popular ? "bg-charcoal-950 text-white border-charcoal-950 shadow-2xl scale-105 z-10" : "bg-white text-charcoal-950 border-charcoal-200 hover:border-primaryBlue/50 transition-colors"}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primaryBlue to-indigo text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <p className={`text-sm ${plan.popular ? "text-charcoal-300" : "text-charcoal-500"}`}>
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
                                            className="text-5xl font-bold"
                                        >
                                            {plan.price[billingCycle]}
                                        </motion.span>
                                    </AnimatePresence>
                                    {plan.price.monthly !== "Custom" && (
                                        <span className={`text-sm ${plan.popular ? "text-charcoal-400" : "text-charcoal-500"}`}>/month</span>
                                    )}
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm font-medium">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.popular ? "bg-primaryBlue text-white" : "bg-primaryBlue/10 text-primaryBlue"}`}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button
                                className={`w-full h-12 text-base font-semibold ${plan.popular ? "bg-white text-charcoal-950 hover:bg-charcoal-100" : "bg-charcoal-950 text-white hover:bg-charcoal-800"}`}
                            >
                                {plan.cta}
                            </Button>
                        </motion.div>
                    ))}
                </div>

                {/* Feature Comparison Toggle */}
                <div className="max-w-[1000px] mx-auto">
                    <button
                        onClick={() => setIsComparisonOpen(!isComparisonOpen)}
                        className="w-full flex items-center justify-center gap-2 text-charcoal-600 font-semibold hover:text-primaryBlue transition-colors mb-8"
                    >
                        Compare all features
                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isComparisonOpen ? "rotate-180" : ""}`} />
                    </button>

                    <motion.div
                        initial={false}
                        animate={{ height: isComparisonOpen ? "auto" : 0, opacity: isComparisonOpen ? 1 : 0 }}
                        className="overflow-hidden"
                    >
                        <div className="border border-charcoal-200 rounded-2xl overflow-hidden">
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
                                <div key={i} className="grid grid-cols-4 p-4 border-t border-charcoal-100 text-sm hover:bg-charcoal-50 transition-colors">
                                    <div className="pl-4 font-medium text-charcoal-900">{row.name}</div>
                                    <div className="text-center text-charcoal-600">
                                        {typeof row.s === "boolean" ? (row.s ? <Check className="mx-auto text-emerald w-5" /> : <X className="mx-auto text-charcoal-300 w-5" />) : row.s}
                                    </div>
                                    <div className="text-center font-semibold text-charcoal-900 bg-primaryBlue/5 -my-4 py-4">
                                        {typeof row.g === "boolean" ? (row.g ? <Check className="mx-auto text-emerald w-5" /> : <X className="mx-auto text-charcoal-300 w-5" />) : row.g}
                                    </div>
                                    <div className="text-center text-charcoal-600">
                                        {typeof row.e === "boolean" ? (row.e ? <Check className="mx-auto text-emerald w-5" /> : <X className="mx-auto text-charcoal-300 w-5" />) : row.e}
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
