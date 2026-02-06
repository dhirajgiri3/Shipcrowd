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
        <section className="py-24 bg-primary overflow-hidden relative pt-42">
            {/* Background Gradient Mesh */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-50/50 via-bg-primary to-bg-primary pointer-events-none" />

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
                        <div className="absolute z-10 w-32 h-32 rounded-full bg-white shadow-2xl shadow-indigo-200/50 flex items-center justify-center border border-indigo-50 p-6">
                            <motion.div
                                className="absolute inset-0 rounded-full border border-primaryBlue/20"
                                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <img
                                src="https://res.cloudinary.com/divbobkmd/image/upload/v1769869575/Shipcrowd-logo_utcmu0.png"
                                alt="Shipcrowd"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Fade overlay: covers orbital bottom + entire header (badge, title, subtitle) */}
                    <div
                        className="absolute inset-x-0 bottom-0 h-[28rem] pointer-events-none z-20"
                        style={{
                            background: "linear-gradient(to top, var(--bg-primary) 0%, var(--bg-primary) 10%, transparent 100%)",
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
            className="absolute rounded-full border border-dashed border-gray-200 flex items-center justify-center"
            style={{ width: radius * 2, height: radius * 2 }}
        >
            {/* The Rotating Container */}
            <motion.div
                className="w-full h-full relative"
                animate={{ rotate: direction * 360 }}
                transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
            >
                {logos.map((logo, i) => (
                    <div
                        key={i}
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        // Position logic: The 'rotate' on the parent moves the top point around. 
                        // But we want fixed angles relative to the ring start. 
                        // So we rotate the individual logo wrapper to its starting angle.
                        style={{
                            width: 60, height: 60,
                            transform: `rotate(${logo.angle}deg) translateY(-${radius}px) rotate(-${logo.angle}deg)`
                            // This generic CSS transform approach places them correctly around the circle WITHOUT moving the parent's generic rotation. 
                            // BUT, since the PARENT is rotating, we just need to place them at top and let parent rotate?
                            // No, if we map them, we need to place them at specific angles.
                            // Better approach: Absolute position based on angle.
                            // Actually, simpler:
                            // The wrapper is rotating. We place items absolute at top, then rotate the WRAPPER for that item?
                            // Let's retry the standard orbital approach:
                            // Parent rotates. Children are placed at specific degrees.
                        }}
                    >
                        {/* 
                            Correct positioning logic for a rotating parent:
                            The parent rotates 0->360.
                            To place items at 0, 120, 240:
                            Item 1: Rotate(0) TranslateY(-R)
                            Item 2: Rotate(120) TranslateY(-R)
                            Item 3: Rotate(240) TranslateY(-R)
                         */}
                    </div>
                ))}
            </motion.div>

            {/* Re-implementing correctly to avoid the confusion above */}
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
                            className="w-full h-full bg-white rounded-full p-3 shadow-md border border-gray-100 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
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
