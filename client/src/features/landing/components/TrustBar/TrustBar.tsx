"use client"

import { motion } from "framer-motion"
import React, { memo } from "react"

const ORBITAL_LOGOS = [
    // Inner Ring (Radius: 160)
    { name: "Delhivery", src: "/logos/delhivery.png", ring: 1, angle: 0 },
    { name: "Shadowfax", src: "/logos/shadowfax.png", ring: 1, angle: 120 },
    { name: "DTDC", src: "/logos/dtdc.png", ring: 1, angle: 240 },

    // Middle Ring (Radius: 260)
    { name: "Blue Dart", src: "/logos/blue-dart.png", ring: 2, angle: 45 },
    { name: "Ecom Express", src: "/logos/ecom-express.png", ring: 2, angle: 135 },
    { name: "Xpressbees", src: "/logos/xpressbees.png", ring: 2, angle: 225 },
    { name: "Ekart", src: "/logos/ekart.png", ring: 2, angle: 315 },

    // Outer Ring (Radius: 360)
    { name: "FedEx", src: "/logos/fedex.png", ring: 3, angle: 90 },
    { name: "DHL", src: "/logos/dhl.png", ring: 3, angle: 210 },
    { name: "India Post", src: "/logos/india-post.png", ring: 3, angle: 330 },
]

export default function TrustBar() {
    return (
        <section className="py-24 bg-primary overflow-hidden relative pt-40">
            {/* Soft radial glow from center — theme-aware */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 80% 70% at 50% 35%, color-mix(in srgb, var(--primary-blue) 6%, transparent) 0%, transparent 55%)",
                }}
            />
            <div
                className="absolute inset-0 pointer-events-none opacity-90"
                style={{
                    background: "radial-gradient(circle at 50% 40%, var(--bg-secondary) 0%, var(--bg-primary) 45%, var(--bg-primary) 100%)",
                }}
            />

            <div className="container mx-auto px-6 relative z-10">
                {/* Wrapper so fade can cover orbital + full header (badge, title, subtitle) */}
                <div className="relative isolate min-h-[520px]">
                    {/* Orbital System — rings and hub */}
                    <div className="relative w-full min-h-[520px] flex items-center justify-center pt-12">
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                            <OrbitalRing radius={160} speed={40} direction={1} ringIndex={1} />
                            <OrbitalRing radius={260} speed={55} direction={-1} ringIndex={2} />
                            <OrbitalRing radius={360} speed={70} direction={1} ringIndex={3} />
                        </div>
                        <div className="absolute z-10 w-32 h-32 rounded-full bg-(--bg-elevated) flex items-center justify-center border border-primaryBlue/10 dark:border-primaryBlue/20 p-6 shadow-[0_0_0_1px_var(--border-subtle),0_8px_32px_-8px_rgba(37,37,255,0.12)] dark:shadow-[0_0_0_1px_var(--border-default),0_8px_32px_-8px_rgba(123,97,255,0.15)]">
                            <motion.div
                                className="absolute inset-0 rounded-full border border-primaryBlue/20"
                                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <img
                                src="https://res.cloudinary.com/divbobkmd/image/upload/v1769869575/Shipcrowd-logo_utcmu0.png"
                                alt="Shipcrowd"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Sleek fade: smooth multi-stop gradient so orbitals blend into content */}
                    <div
                        className="absolute inset-x-0 bottom-0 h-128 pointer-events-none z-20"
                        style={{
                            background: `
                                linear-gradient(
                                    to top,
                                    var(--bg-primary) 0%,
                                    var(--bg-primary) 8%,
                                    color-mix(in srgb, var(--bg-primary) 92%, transparent) 18%,
                                    color-mix(in srgb, var(--bg-primary) 75%, transparent) 32%,
                                    color-mix(in srgb, var(--bg-primary) 45%, transparent) 52%,
                                    color-mix(in srgb, var(--bg-primary) 18%, transparent) 72%,
                                    transparent 92%
                                )
                            `,
                        }}
                        aria-hidden
                    />
                    {/* Soft edge vignette so orbital fades at left/right on small viewports */}
                    <div
                        className="absolute inset-0 pointer-events-none z-18"
                        style={{
                            background: "linear-gradient(to right, var(--bg-primary) 0%, transparent 14%, transparent 86%, var(--bg-primary) 100%)",
                        }}
                        aria-hidden
                    />

                    {/* Header: badge + title + subtitle overlaid on fade */}
                    <div className="text-center max-w-2xl mx-auto -mt-32 relative z-30 px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primaryBlue/5 border border-primaryBlue/10 mb-4"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-primaryBlue animate-pulse" />
                            <span className="text-caption font-semibold text-primaryBlue uppercase tracking-widest">Global Network</span>
                        </motion.div>
                        <h2 className="text-title-xl md:text-display-lg font-bold text-primary mb-4 tracking-tight">
                            Connected to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryBlue via-indigo-500 to-primaryBlue bg-300% animate-gradient">Everywhere.</span>
                        </h2>
                        <p className="text-secondary text-body-lg">
                            Seamlessly integrated with top-tier courier partners for maximum reach.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

const OrbitalRing = memo(function OrbitalRing({ radius, speed, direction, ringIndex }: { radius: number, speed: number, direction: number, ringIndex: number }) {
    const logos = ORBITAL_LOGOS.filter(l => l.ring === ringIndex)

    return (
        <div
            className="absolute rounded-full border border-dashed border-primaryBlue/10 dark:border-primaryBlue/20 flex items-center justify-center"
            style={{ width: radius * 2, height: radius * 2 }}
        >
            <motion.div
                className="w-full h-full absolute inset-0"
                animate={{ rotate: direction * 360 }}
                transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
            >
                {logos.map((logo, i) => (
                    <div
                        key={logo.name}
                        className="absolute top-1/2 left-1/2 w-16 h-16 -ml-8 -mt-8"
                        style={{
                            transform: `rotate(${logo.angle}deg) translate(${radius}px) rotate(-${logo.angle}deg)`
                        }}
                    >
                        {/* Counter-Rotate to keep upright */}
                        <motion.div
                            className="w-full h-full bg-(--bg-elevated) rounded-full p-3 border border-(--border-default) flex items-center justify-center hover:scale-110 transition-transform duration-200 cursor-pointer hover:border-primaryBlue/20"
                            animate={{ rotate: direction * -360 }}
                            transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
                        >
                            <img
                                src={logo.src}
                                alt={logo.name}
                                className="w-full h-full object-contain grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100"
                                draggable="false"
                            />
                        </motion.div>
                    </div>
                ))}
            </motion.div>
        </div>
    )
})
