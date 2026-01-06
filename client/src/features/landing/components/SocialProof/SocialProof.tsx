"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Star, Quote, Play, Pause, CheckCircle2, ShieldCheck, Users, Clock, TrendingUp } from "lucide-react"

export default function SocialProof() {
    const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })
    const [isPlaying, setIsPlaying] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
            } else {
                videoRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    return (
        <section className="py-24 md:py-32 bg-white overflow-hidden border-y border-gray-100">
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Header */}
                <div className="grid lg:grid-cols-[55%_45%] gap-12 mb-16 items-start">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2.5 mb-6"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald" />
                            <span className="text-emerald text-sm font-medium tracking-wide">
                                Trusted by Hundreds
                            </span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6 tracking-tight"
                        >
                            Real Businesses.<br />
                            Real Results.<br />
                            <span className="text-primaryBlue">Real Relief.</span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-lg text-gray-600 max-w-[500px]"
                        >
                            From bootstrapped startups to established brands shipping 10,000+ orders monthly...
                        </motion.p>
                    </div>

                    {/* Trust Stat Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-gray-100"
                    >
                        <div className="grid grid-cols-2 gap-6">
                            {[
                                { icon: ShieldCheck, value: "99.9%", label: "Uptime", color: "text-primaryBlue" },
                                { icon: Users, value: "500+", label: "Businesses", color: "text-primaryBlue" },
                                { icon: Star, value: "4.9", label: "Rating", color: "text-amber" },
                                { icon: Clock, value: "24/7", label: "Support", color: "text-emerald" },
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4 + i * 0.1 }}
                                    className="text-center"
                                >
                                    <div className={`w-12 h-12 mx-auto bg-gray-50 rounded-xl flex items-center justify-center ${stat.color} mb-3`}>
                                        <stat.icon size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                    <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Featured Testimonial */}
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.8 }}
                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_70px_-15px_rgba(37,37,255,0.12)] transition-all duration-500 flex flex-col md:flex-row gap-8 items-stretch"
                >
                    {/* Video/Image Side */}
                    <div
                        className="w-full md:w-[380px] h-[500px] md:h-auto relative rounded-2xl overflow-hidden group cursor-pointer flex-shrink-0 shadow-xl"
                        onClick={togglePlay}
                    >
                        <video
                            ref={videoRef}
                            src="https://res.cloudinary.com/divbobkmd/video/upload/v1765282012/Priya-sharma_bygla9.mp4"
                            loop
                            muted={false}
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                        />
                        {/* Gradient overlay - only show when paused or hovering */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10 transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`} />

                        {/* Play Button */}
                        <div className={`absolute inset-0 flex items-center justify-center z-20 transition-all duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100 scale-90' : 'opacity-100 scale-100'}`}>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300"
                            >
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center pl-1 shadow-lg">
                                    {isPlaying ? (
                                        <Pause size={24} className="text-primaryBlue fill-primaryBlue" />
                                    ) : (
                                        <Play size={24} className="text-primaryBlue fill-primaryBlue" />
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Customer info */}
                        <div className="absolute bottom-6 left-6 z-20 text-white">
                            <div className="font-bold text-lg mb-1">Priya Sharma</div>
                            <div className="text-sm opacity-90 mb-2">Founder & CEO, StyleHub</div>
                            <div className="flex gap-1 text-amber">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                            </div>
                        </div>

                        {/* Company badge */}
                        <div className="absolute top-6 right-6 z-20 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
                            <div className="w-5 h-5 bg-primaryBlue rounded flex items-center justify-center">
                                <ShieldCheck size={12} className="text-white" />
                            </div>
                            <span className="font-bold text-gray-900 text-sm">StyleHub</span>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="flex-1 py-4 md:py-6 md:pr-6 flex flex-col justify-center">
                        <Quote className="text-primaryBlue/20 w-12 h-12 mb-4" />

                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
                            "ShipCrowd cut our shipping costs by 23% and saved our operations team 15 hours every week..."
                        </h3>

                        <p className="text-gray-600 mb-6 leading-relaxed">
                            We used to juggle 7 different courier dashboards. Now everything is in one place with AI doing the heavy lifting. Game changer for our business.
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald/10 text-emerald rounded-full font-semibold text-sm">
                                <TrendingUp size={16} />
                                23% cost reduction
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primaryBlue/10 text-primaryBlue rounded-full font-semibold text-sm">
                                <Clock size={16} />
                                15 hrs saved/week
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Additional testimonials grid (optional) */}
                <div className="mt-16 grid md:grid-cols-3 gap-6">
                    {[
                        { name: "Rajesh Kumar", company: "TechStore", quote: "Automation is incredible. We process 1000+ orders daily with zero manual work." },
                        { name: "Anita Desai", company: "FashionHub", quote: "Customer complaints dropped by 60% with real-time tracking. Amazing!" },
                        { name: "Vikram Singh", company: "HomeGoods", quote: "The AI rate comparison alone saves us ₹50K monthly. Worth every penny." }
                    ].map((testimonial, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 * i }}
                            className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex gap-1 text-amber mb-3">
                                {[1, 2, 3, 4, 5].map(j => <Star key={j} size={12} fill="currentColor" />)}
                            </div>
                            <p className="text-sm text-gray-700 mb-4 leading-relaxed">"{testimonial.quote}"</p>
                            <div>
                                <div className="font-bold text-gray-900 text-sm">{testimonial.name}</div>
                                <div className="text-xs text-gray-500">{testimonial.company}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
