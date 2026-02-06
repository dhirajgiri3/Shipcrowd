"use client"

import { useState, useRef } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Star, Quote, Play, Pause, ShieldCheck, Users, Clock, TrendingUp } from "lucide-react"

const STATS = [
    { icon: ShieldCheck, value: "99.9%", label: "Uptime", color: "text-primaryBlue" },
    { icon: Users, value: "500+", label: "Businesses", color: "text-primaryBlue" },
    { icon: Star, value: "4.9", label: "Rating", color: "text-amber" },
    { icon: Clock, value: "24/7", label: "Support", color: "text-emerald" },
] as const

const TESTIMONIALS_GRID = [
    { name: "Rajesh Kumar", company: "TechStore", quote: "Automation is incredible. We process 1000+ orders daily with zero manual work." },
    { name: "Anita Desai", company: "FashionHub", quote: "Customer complaints dropped by 60% with real-time tracking. Amazing!" },
    { name: "Vikram Singh", company: "HomeGoods", quote: "The AI rate comparison alone saves us ₹50K monthly. Worth every penny." },
] as const

export default function SocialProof() {
    const reducedMotion = useReducedMotion()
    const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true })
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
        <section
            id="social-proof"
            aria-label="Social proof - testimonials and trust metrics"
            className="relative py-24 md:py-32 overflow-hidden bg-primary"
        >
            <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--tw-gradient-stops))] from-primaryBlue/6 via-transparent to-transparent" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primaryBlue/5 rounded-full blur-[100px]" />
            </div>
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                {/* Header */}
                <div className="grid lg:grid-cols-[55%_45%] gap-12 mb-16 items-start">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primaryBlue/5 border border-primaryBlue/10 mb-6 backdrop-blur-sm"
                        >
                            <Users size={12} className="text-primaryBlue shrink-0" aria-hidden="true" />
                            <span className="text-xs font-bold text-primaryBlue tracking-widest uppercase">
                                Trusted by Hundreds
                            </span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.08 }}
                            className="text-display-lg md:text-display-xl font-bold leading-tight mb-6 tracking-tighter text-primary"
                        >
                            Real Businesses.<br />
                            Real Results.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryBlue via-indigo-500 to-primaryBlue bg-300% animate-gradient">Real Relief.</span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.15 }}
                            className="text-body-lg text-secondary max-w-[500px]"
                        >
                            From bootstrapped startups to established brands shipping 10,000+ orders monthly...
                        </motion.p>
                    </div>

                    {/* Trust Stat Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.2 }}
                        className="rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[var(--border-default)] bg-[var(--bg-primary)]/90 backdrop-blur-xl"
                    >
                        <div className="grid grid-cols-2 gap-6">
                            {STATS.map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
                                    whileInView={reducedMotion ? {} : { opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.25 + i * 0.06 }}
                                    className="text-center"
                                >
                                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] ${stat.color}`}>
                                        <stat.icon size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                                    <div className="text-caption font-medium text-secondary">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Featured Testimonial */}
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: reducedMotion ? 0.25 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-3xl p-6 border border-[var(--border-default)] bg-[var(--bg-primary)]/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-primaryBlue/20 hover:shadow-lg hover:shadow-primaryBlue/5 transition-all duration-500 flex flex-col md:flex-row gap-8 items-stretch"
                >
                    {/* Video/Image Side */}
                    <div
                        role="button"
                        tabIndex={0}
                        aria-label={isPlaying ? "Pause testimonial video" : "Play testimonial video"}
                        className="w-full md:w-[380px] h-[500px] md:h-auto min-h-[320px] relative rounded-2xl overflow-hidden group cursor-pointer flex-shrink-0 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryBlue focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
                        onClick={togglePlay}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePlay() } }}
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
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10 transition-opacity duration-300 ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`} aria-hidden />

                        <div className={`absolute inset-0 flex items-center justify-center z-20 transition-all duration-300 ${isPlaying ? "opacity-0 group-hover:opacity-100 scale-90" : "opacity-100 scale-100"}`}>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"
                            >
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center pl-1 shadow-lg">
                                    {isPlaying ? (
                                        <Pause size={24} className="text-primaryBlue fill-primaryBlue" aria-hidden />
                                    ) : (
                                        <Play size={24} className="text-primaryBlue fill-primaryBlue" aria-hidden />
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        <div className="absolute bottom-6 left-6 z-20 text-white">
                            <div className="font-bold text-lg mb-1">Priya Sharma</div>
                            <div className="text-sm opacity-90 mb-2">Founder & CEO, StyleHub</div>
                            <div className="flex gap-1 text-amber" aria-hidden>
                                {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill="currentColor" />)}
                            </div>
                        </div>

                        <div className="absolute top-6 right-6 z-20 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg border border-[var(--border-default)]">
                            <div className="w-5 h-5 bg-primaryBlue rounded flex items-center justify-center">
                                <ShieldCheck size={12} className="text-white" aria-hidden />
                            </div>
                            <span className="font-bold text-primary text-sm">StyleHub</span>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="flex-1 py-4 md:py-6 md:pr-6 flex flex-col justify-center">
                        <motion.div
                            initial={reducedMotion ? false : { opacity: 0 }}
                            animate={inView ? { opacity: 1 } : {}}
                            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.1 }}
                        >
                            <Quote className="text-primaryBlue/20 w-12 h-12 mb-4" aria-hidden />
                        </motion.div>
                        <motion.h3
                            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.15 }}
                            className="text-title-xl md:text-3xl font-bold text-primary leading-tight mb-6 tracking-tight"
                        >
                            "Shipcrowd cut our shipping costs by 23% and saved our operations team 15 hours every week..."
                        </motion.h3>

                        <motion.p
                            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.22 }}
                            className="text-body-base text-secondary mb-6 leading-relaxed"
                        >
                            We used to juggle 7 different courier dashboards. Now everything is in one place with AI doing the heavy lifting. Game changer for our business.
                        </motion.p>

                        <motion.div
                            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.3 }}
                            className="flex flex-wrap items-center gap-3"
                        >
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm bg-[var(--success-bg)] text-[var(--success)] focus-within:ring-2 focus-within:ring-[var(--success)] focus-within:ring-offset-2">
                                <TrendingUp size={16} aria-hidden />
                                23% cost reduction
                            </span>
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm bg-primaryBlue/10 text-primaryBlue focus-within:ring-2 focus-within:ring-primaryBlue focus-within:ring-offset-2">
                                <Clock size={16} aria-hidden />
                                15 hrs saved/week
                            </span>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Additional testimonials grid */}
                <div className="mt-16 grid md:grid-cols-3 gap-6">
                    {TESTIMONIALS_GRID.map((testimonial, i) => (
                        <motion.div
                            key={testimonial.name}
                            initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, threshold: 0.1 }}
                            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.05 + i * 0.08 }}
                            className="rounded-2xl p-6 border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-primaryBlue/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <div className="flex gap-1 text-amber mb-3" aria-hidden>
                                {[1, 2, 3, 4, 5].map((j) => (
                                    <Star key={j} size={12} fill="currentColor" />
                                ))}
                            </div>
                            <p className="text-body-sm text-secondary mb-4 leading-relaxed">"{testimonial.quote}"</p>
                            <div>
                                <div className="font-bold text-primary text-sm">{testimonial.name}</div>
                                <div className="text-caption text-secondary">{testimonial.company}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
