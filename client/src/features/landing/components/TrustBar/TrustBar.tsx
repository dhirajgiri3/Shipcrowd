"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"

export default function TrustBar() {
    const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true })

    // SVG viewBox dimensions
    const viewBoxWidth = 1200
    const viewBoxHeight = 700
    const centerX = viewBoxWidth / 2
    const centerY = 600 // Moved up from 700 for better visual balance

    // Define orbital rings with their radii and rotation speeds
    const rings = [
        { radius: 180, strokeWidth: 1.5, opacity: 0.3, rotationDuration: 60 },
        { radius: 280, strokeWidth: 1.5, opacity: 0.25, rotationDuration: 80 },
        { radius: 380, strokeWidth: 1.5, opacity: 0.2, rotationDuration: 100 },
        { radius: 480, strokeWidth: 1.5, opacity: 0.15, rotationDuration: 120 },
    ]

    // Distribute logos across different rings
    const logoConfig = [
        // Ring 1 (innermost) - 2 logos
        { name: "Microsoft", src: "/logos/delhivery.png", ring: 0, angle: 180, size: 60 },
        { name: "Meta", src: "/logos/shadowfax.png", ring: 0, angle: 0, size: 60 },

        // Ring 2 - 3 logos
        { name: "Google", src: "/logos/dtdc.png", ring: 1, angle: 180, size: 70 },
        { name: "Intel", src: "/logos/ecom-express.png", ring: 1, angle: 270, size: 70 },
        { name: "RZS", src: "/logos/blue-dart.png", ring: 1, angle: 45, size: 70 },

        // Ring 3 - 3 logos
        { name: "Maha", src: "/logos/xpressbees.png", ring: 2, angle: 210, size: 80 },
        { name: "ABN", src: "/logos/ekart.png", ring: 2, angle: 150, size: 80 },
        { name: "Asus", src: "/logos/india-post.png", ring: 2, angle: 330, size: 80 },

        // Ring 4 (outermost) - 2 logos
        { name: "MC", src: "/logos/fedex.png", ring: 3, angle: 60, size: 85 },
        { name: "IBM", src: "/logos/dhl.png", ring: 3, angle: 290, size: 85 },
    ]

    // Calculate position on circle using polar coordinates
    const getPositionOnCircle = (radius: number, angle: number) => {
        const radians = (angle * Math.PI) / 180
        return {
            x: centerX + radius * Math.cos(radians),
            y: centerY - radius * Math.sin(radians), // Subtract because SVG Y increases downward
        }
    }

    // Generate SVG arc path for semi-circle
    const generateArcPath = (radius: number) => {
        const startX = centerX - radius
        const startY = centerY
        const endX = centerX + radius
        const endY = centerY

        return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`
    }

    return (
        <section ref={ref} className="py-20 md:py-24 bg-gradient-to-b from-gray-50 to-white overflow-hidden border-b border-gray-100">
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Minimal Header Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-[800px] mx-auto"
                >
                    {/* Minimal Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="inline-flex items-center gap-2.5 mb-6"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-primaryBlue" />
                        <span className="text-charcoal-600 text-sm font-medium tracking-wide">
                            Trusted Logistics Network
                        </span>
                    </motion.div>

                    {/* Clean Title */}
                    <motion.h2
                        className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <span className="text-charcoal-900">
                            Powered by
                        </span>
                        <br />
                        <span className="text-primaryBlue relative inline-block">
                            5+ Global Carriers
                            {/* Minimal underline */}
                            <motion.div
                                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-primaryBlue/20"
                                initial={{ scaleX: 0 }}
                                animate={inView ? { scaleX: 1 } : {}}
                                transition={{ duration: 0.6, delay: 0.5 }}
                                style={{ transformOrigin: "left" }}
                            />
                        </span>
                    </motion.h2>

                    {/* Simple Subtitle */}
                    <motion.p
                        className="text-lg text-charcoal-500 max-w-2xl mx-auto leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={inView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        Seamlessly integrated with the world's leading courier partners
                    </motion.p>
                </motion.div>

                {/* Circular Orbital Design */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="relative w-full max-w-[1200px] mx-auto"
                >
                    <svg
                        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                        className="w-full h-auto"
                        style={{ minHeight: "550px" }}
                    >
                        {/* Enhanced gradient definitions */}
                        <defs>
                            {/* Premium ring gradient with blue to purple transition */}
                            <linearGradient id="ringGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#2525FF" stopOpacity="0" />
                                <stop offset="20%" stopColor="#4F46E5" stopOpacity="0.5" />
                                <stop offset="50%" stopColor="#2525FF" stopOpacity="1" />
                                <stop offset="80%" stopColor="#4F46E5" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#2525FF" stopOpacity="0" />
                            </linearGradient>

                            {/* Secondary ring gradient */}
                            <linearGradient id="ringGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366F1" stopOpacity="0" />
                                <stop offset="25%" stopColor="#8B5CF6" stopOpacity="0.4" />
                                <stop offset="50%" stopColor="#6366F1" stopOpacity="0.8" />
                                <stop offset="75%" stopColor="#8B5CF6" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                            </linearGradient>

                            {/* Tertiary ring gradient */}
                            <linearGradient id="ringGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#818CF8" stopOpacity="0" />
                                <stop offset="30%" stopColor="#A78BFA" stopOpacity="0.35" />
                                <stop offset="50%" stopColor="#818CF8" stopOpacity="0.6" />
                                <stop offset="70%" stopColor="#A78BFA" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
                            </linearGradient>

                            {/* Outer ring gradient */}
                            <linearGradient id="ringGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#A5B4FC" stopOpacity="0" />
                                <stop offset="35%" stopColor="#C7D2FE" stopOpacity="0.3" />
                                <stop offset="50%" stopColor="#A5B4FC" stopOpacity="0.5" />
                                <stop offset="65%" stopColor="#C7D2FE" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#A5B4FC" stopOpacity="0" />
                            </linearGradient>

                            {/* Refined background gradient */}
                            <radialGradient id="bgGradient" cx="50%" cy="100%" r="75%">
                                <stop offset="0%" stopColor="#EEF2FF" stopOpacity="0.6" />
                                <stop offset="50%" stopColor="#E0E7FF" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#F9FAFB" stopOpacity="0" />
                            </radialGradient>

                            {/* Subtle glow filter for rings */}
                            <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Background glow */}
                        <ellipse
                            cx={centerX}
                            cy={centerY}
                            rx="500"
                            ry="380"
                            fill="url(#bgGradient)"
                        />

                        {/* Orbital Rings with enhanced gradients */}
                        {rings.map((ring, index) => (
                            <motion.path
                                key={index}
                                d={generateArcPath(ring.radius)}
                                fill="none"
                                stroke={`url(#ringGradient${index + 1})`}
                                strokeWidth={index === 0 ? 2 : index === 1 ? 1.8 : index === 2 ? 1.5 : 1.2}
                                strokeLinecap="round"
                                filter="url(#ringGlow)"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                                transition={{
                                    duration: 2,
                                    delay: index * 0.15,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}

                        {/* Logos positioned on rings with rotation animation */}
                        {rings.map((ring, ringIndex) => {
                            // Filter logos for this ring
                            const ringLogos = logoConfig.filter(logo => logo.ring === ringIndex)

                            return (
                                <motion.g
                                    key={`ring-${ringIndex}`}
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        duration: ring.rotationDuration,
                                        ease: "linear",
                                        repeat: Infinity,
                                    }}
                                    // Use SVG transform-origin, center-based rotation
                                    style={{
                                        transformOrigin: `${centerX}px ${centerY}px`,
                                        transformBox: 'fill-box'
                                    }}
                                >
                                    {ringLogos.map((logo, logoIndex) => {
                                        const position = getPositionOnCircle(
                                            ring.radius,
                                            logo.angle
                                        )

                                        return (
                                            <motion.g
                                                key={`${ringIndex}-${logoIndex}`}
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={inView ? { opacity: 1, scale: 1 } : {}}
                                                transition={{
                                                    duration: 0.5,
                                                    delay: 0.5 + (ringIndex * ringLogos.length + logoIndex) * 0.1,
                                                    type: "spring",
                                                    stiffness: 200
                                                }}
                                                // Counter-rotate to keep logo upright
                                                style={{
                                                    rotate: `calc(var(--rotation) * -1)`,
                                                }}
                                            >
                                                {/* White circle background - minimal, no shadow */}
                                                <circle
                                                    cx={position.x}
                                                    cy={position.y}
                                                    r={logo.size / 2}
                                                    fill="white"
                                                    stroke="#E5E7EB"
                                                    strokeWidth="0.5"
                                                />

                                                {/* Logo image - counter-rotate to keep upright */}
                                                <motion.g
                                                    animate={{ rotate: -360 }}
                                                    transition={{
                                                        duration: ring.rotationDuration,
                                                        ease: "linear",
                                                        repeat: Infinity,
                                                    }}
                                                    style={{
                                                        transformOrigin: `${position.x}px ${position.y}px`,
                                                        transformBox: 'fill-box'
                                                    }}
                                                >
                                                    <foreignObject
                                                        x={position.x - logo.size / 2}
                                                        y={position.y - logo.size / 2}
                                                        width={logo.size}
                                                        height={logo.size}
                                                    >
                                                        <div className="w-full h-full flex items-center justify-center p-2 group">
                                                            <motion.img
                                                                src={logo.src}
                                                                alt={logo.name}
                                                                className="max-w-[80%] max-h-[80%] object-contain transition-all duration-300"
                                                                style={{
                                                                    clipPath: 'circle(50% at center)',
                                                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0))'
                                                                }}
                                                                whileHover={{
                                                                    scale: 1.15,
                                                                    filter: 'drop-shadow(0 4px 12px rgba(37,37,255,0.3))'
                                                                }}
                                                            />
                                                        </div>
                                                    </foreignObject>
                                                </motion.g>
                                            </motion.g>
                                        )
                                    })}
                                </motion.g>
                            )
                        })}

                        {/* Center Shipcrowd Logo - Minimal Design */}
                        <motion.g
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={inView ? { opacity: 1, scale: 1 } : {}}
                            transition={{
                                duration: 0.6,
                                delay: 0.8,
                                ease: "easeOut"
                            }}
                        >
                            {/* Subtle outer ring */}
                            <motion.circle
                                cx={centerX}
                                cy={centerY}
                                r="92"
                                fill="none"
                                stroke="#2525FF"
                                strokeWidth="1"
                                opacity="0.15"
                                animate={{
                                    r: [92, 95, 92],
                                    opacity: [0.15, 0.25, 0.15]
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />

                            {/* Main clean circle */}
                            <circle
                                cx={centerX}
                                cy={centerY}
                                r="85"
                                fill="white"
                                stroke="#E5E7EB"
                                strokeWidth="1"
                            />

                            {/* Shipcrowd logo */}
                            <foreignObject
                                x={centerX - 50}
                                y={centerY - 50}
                                width="100"
                                height="100"
                            >
                                <div className="w-full h-full flex items-center justify-center">
                                    <motion.img
                                        src="https://res.cloudinary.com/divbobkmd/image/upload/v1767468077/Shipcrowd_logo_yopeh9.png"
                                        alt="Shipcrowd"
                                        className="w-[75%] h-[75%] object-contain rounded-full"
                                        initial={{ opacity: 0.95 }}
                                        animate={{
                                            opacity: [0.95, 1, 0.95]
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    />
                                </div>
                            </foreignObject>
                        </motion.g>

                        {/* Enhanced gradient definitions */}
                        <defs>
                            {/* Center glow gradient */}
                            <linearGradient id="centerGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2525FF" />
                                <stop offset="100%" stopColor="#8B5CF6" />
                            </linearGradient>

                            {/* Glassmorphism gradient */}
                            <radialGradient id="centerGlassGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#F0F4FF" />
                                <stop offset="100%" stopColor="#FAFBFF" />
                            </radialGradient>

                            {/* Center shadow filter */}
                            <filter id="centerShadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                <feOffset dx="0" dy="2" result="offsetblur" />
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.15" />
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                    </svg>
                </motion.div>
            </div>
        </section>
    )
}
