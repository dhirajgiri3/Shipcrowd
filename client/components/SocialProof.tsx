"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Star, Quote, Play, CheckCircle2, Clock, ShieldCheck, Users } from "lucide-react"

export default function SocialProof() {
    const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })

    return (
        <section className="py-32 bg-gradient-to-b from-white to-charcoal-50 overflow-hidden">
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Header */}
                <div className="grid lg:grid-cols-[50%_50%] gap-12 mb-20 items-start">
                    <div>
                        <div className="text-[13px] font-bold text-emerald tracking-widest uppercase mb-4">
                            Trusted by Hundreds
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-charcoal-950 leading-tight mb-6">
                            Real Businesses.<br />Real Results.<br />Real Relief.
                        </h2>
                        <p className="text-lg text-charcoal-600 max-w-[500px]">
                            From bootstrapped startups to established brands shipping 10,000+ orders monthly...
                        </p>
                    </div>

                    {/* Trust Stat Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-2xl p-8 shadow-xl border border-charcoal-100"
                    >
                        <div className="text-xs font-bold text-charcoal-400 uppercase tracking-wider mb-6">Trust Stat Bar</div>
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                                <div className="w-10 h-10 mx-auto bg-primaryBlue rounded-full flex items-center justify-center text-white mb-3">
                                    <ShieldCheck size={20} />
                                </div>
                                <div className="text-2xl font-bold text-charcoal-900">99.9%</div>
                                <div className="text-xs text-charcoal-500">Uptime Guarantee</div>
                            </div>
                            <div>
                                <div className="w-10 h-10 mx-auto bg-primaryBlue/10 rounded-full flex items-center justify-center text-primaryBlue mb-3">
                                    <Users size={20} />
                                </div>
                                <div className="text-2xl font-bold text-charcoal-900">500+</div>
                                <div className="text-xs text-charcoal-500">Growing Businesses</div>
                            </div>
                            <div>
                                <div className="w-10 h-10 mx-auto bg-primaryBlue/10 rounded-full flex items-center justify-center text-primaryBlue mb-3">
                                    <Star size={20} />
                                </div>
                                <div className="text-2xl font-bold text-charcoal-900">4.9</div>
                                <div className="text-xs text-charcoal-500">Average Rating</div>
                            </div>
                            <div>
                                <div className="w-10 h-10 mx-auto bg-primaryBlue/10 rounded-full flex items-center justify-center text-primaryBlue mb-3">
                                    <Clock size={20} />
                                </div>
                                <div className="text-2xl font-bold text-charcoal-900">24/7</div>
                                <div className="text-xs text-charcoal-500">Support Available</div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Featured Testimonial (Hero) */}
                <div className="mb-4 text-xs font-bold text-charcoal-400 uppercase tracking-wider">Featured Testimonial</div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="bg-white border-2 border-primaryBlue/10 rounded-3xl p-4 shadow-2xl shadow-primaryBlue/5 flex flex-col md:flex-row gap-8 items-stretch"
                >
                    {/* Video/Image Side */}
                    <div className="w-full md:w-[400px] relative rounded-2xl overflow-hidden bg-charcoal-900 group cursor-pointer">
                        {/* Placeholder Image */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                        <div className="absolute inset-0 bg-charcoal-800" />
                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center pl-1 shadow-lg">
                                    <Play size={20} className="text-primaryBlue fill-primaryBlue" />
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-6 left-6 z-20 text-white">
                            <div className="font-bold text-lg">Priya Sharma</div>
                            <div className="text-sm opacity-80">Founder & CEO, StyleHub</div>
                            <div className="flex gap-1 text-amber-400 mt-2">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                            </div>
                        </div>
                        {/* Logo Badge */}
                        <div className="absolute bottom-6 right-6 z-20 bg-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <div className="w-4 h-4 bg-primaryBlue rounded-sm" />
                            <span className="font-bold text-charcoal-900 text-sm">StyleHub</span>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="flex-1 py-8 pr-8 flex flex-col justify-center">
                        <Quote className="text-primaryBlue w-12 h-12 mb-6 opacity-20" />
                        <h3 className="text-2xl md:text-3xl font-bold text-charcoal-900 leading-tight mb-6">
                            "ShipCrowd cut our shipping costs by 23% and saved our operations team 15 hours every week..."
                        </h3>
                        <div className="text-charcoal-500 mb-8 font-medium">
                            - Priya Sharma, StyleHub
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald/10 text-emerald rounded-full font-semibold text-sm">
                                <CheckCircle2 size={16} />
                                23% cost reduction
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald/10 text-emerald rounded-full font-semibold text-sm">
                                <CheckCircle2 size={16} />
                                15 hrs saved/week
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
