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
        <section ref={ref} className="py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden border-b border-gray-100">
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Unique Header Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-[1000px] mx-auto mb-16 relative"
                >
                    {/* Floating particles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-primaryBlue/20 rounded-full"
                                initial={{
                                    x: Math.random() * 1000,
                                    y: Math.random() * 200,
                                    scale: 0
                                }}
                                animate={{
                                    y: [null, -100, -200],
                                    opacity: [0, 1, 0],
                                    scale: [0, 1, 0]
                                }}
                                transition={{
                                    duration: 3 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                    ease: "easeOut"
                                }}
                            />
                        ))}
                    </div>

                    {/* Badge with pulse effect */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={inView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-gradient-to-r from-primaryBlue/10 via-purple-500/10 to-primaryBlue/10 border border-primaryBlue/20 backdrop-blur-sm mb-6 relative overflow-hidden group"
                    >
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primaryBlue opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primaryBlue"></span>
                        </span>
                        <span className="text-primaryBlue text-xs font-bold tracking-[0.2em] uppercase relative z-10">
                            Our Global Logistics Network
                        </span>
                    </motion.div>

                    {/* Main Title with Split Color Effect */}
                    <div className="relative">
                        <motion.h2
                            className="text-4xl md:text-6xl font-bold mb-6 leading-[1.1]"
                            initial={{ opacity: 0, y: 30 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.7, delay: 0.3 }}
                        >
                            <span className="relative inline-block">
                                <span className="bg-gradient-to-br from-charcoal-900 via-charcoal-700 to-charcoal-900 bg-clip-text text-transparent">
                                    Powered by{" "}
                                </span>
                            </span>
                            <br />
                            <span className="relative inline-block">
                                {/* Left half - gradient */}
                                <span className="bg-gradient-to-r from-primaryBlue via-indigo-600 to-purple-600 bg-clip-text text-transparent font-extrabold">
                                    15+ Global
                                </span>
                                {" "}
                                {/* Right half - solid */}
                                <span className="text-charcoal-900 font-extrabold relative">
                                    Carriers
                                    {/* Underline decoration */}
                                    <svg
                                        className="absolute -bottom-2 left-0 w-full h-3"
                                        viewBox="0 0 200 12"
                                        preserveAspectRatio="none"
                                    >
                                        <motion.path
                                            d="M0 6 Q 50 0 100 6 T 200 6"
                                            stroke="url(#carriersGradient)"
                                            strokeWidth="3"
                                            fill="none"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                                            transition={{ duration: 1.5, delay: 0.8 }}
                                        />
                                        <defs>
                                            <linearGradient id="carriersGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#2525FF" stopOpacity="0.3" />
                                                <stop offset="50%" stopColor="#2525FF" stopOpacity="1" />
                                                <stop offset="100%" stopColor="#2525FF" stopOpacity="0.3" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </span>
                            </span>
                        </motion.h2>

                        {/* Subtitle with typing effect feel */}
                        <motion.p
                            className="text-lg md:text-xl text-charcoal-600 max-w-2xl mx-auto leading-relaxed font-medium"
                            initial={{ opacity: 0 }}
                            animate={inView ? { opacity: 1 } : {}}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            Seamlessly integrated with the world's{" "}
                            <span className="text-primaryBlue font-semibold">top courier partners</span>
                            {" "}to deliver excellence across every mile
                        </motion.p>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute -top-8 left-1/4 w-20 h-20 bg-primaryBlue/5 rounded-full blur-2xl" />
                    <div className="absolute -bottom-8 right-1/4 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
                </motion.div>

                {/* Circular Orbital Design */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative w-full max-w-[1200px] mx-auto"
                >
                    <svg
                        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                        className="w-full h-auto"
                        style={{ minHeight: "500px" }}
                    >
                        {/* Define enhanced gradients for rings */}
                        <defs>
                            {/* Ring gradient with vibrant purple glow */}
                            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
                                <stop offset="25%" stopColor="#A78BFA" stopOpacity="0.4" />
                                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.8" />
                                <stop offset="75%" stopColor="#A78BFA" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                            </linearGradient>

                            {/* Enhanced background gradient */}
                            <radialGradient id="bgGradient" cx="50%" cy="100%" r="80%">
                                <stop offset="0%" stopColor="#EEF2FF" stopOpacity="0.8" />
                                <stop offset="40%" stopColor="#E0E7FF" stopOpacity="0.5" />
                                <stop offset="70%" stopColor="#F3F4F6" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#F9FAFB" stopOpacity="0" />
                            </radialGradient>

                            {/* Glow filter for rings */}
                            <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Background glow */}
                        <ellipse
                            cx={centerX}
                            cy={centerY}
                            rx="500"
                            ry="400"
                            fill="url(#bgGradient)"
                        />

                        {/* Orbital Rings with glow effect */}
                        {rings.map((ring, index) => (
                            <motion.path
                                key={index}
                                d={generateArcPath(ring.radius)}
                                fill="none"
                                stroke="url(#ringGradient)"
                                strokeWidth={ring.strokeWidth * 1.2}
                                opacity={ring.opacity + 0.1}
                                filter="url(#ringGlow)"
                                initial={{ pathLength: 0 }}
                                animate={inView ? { pathLength: 1 } : {}}
                                transition={{
                                    duration: 2,
                                    delay: index * 0.2,
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

                        {/* Center ShipCrowd Logo - Enhanced */}
                        <motion.g
                            initial={{ opacity: 0, scale: 0 }}
                            animate={inView ? { opacity: 1, scale: 1 } : {}}
                            transition={{
                                duration: 0.8,
                                delay: 1,
                                type: "spring",
                                stiffness: 150
                            }}
                        >
                            {/* Outer glow ring */}
                            <motion.circle
                                cx={centerX}
                                cy={centerY}
                                r="95"
                                fill="none"
                                stroke="url(#centerGlowGradient)"
                                strokeWidth="3"
                                opacity="0.4"
                                animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />

                            {/* Main circle with subtle gradient */}
                            <circle
                                cx={centerX}
                                cy={centerY}
                                r="88"
                                fill="white"
                                stroke="#E0E7FF"
                                strokeWidth="1.5"
                                filter="url(#centerShadow)"
                            />

                            {/* Inner glassmorphism effect */}
                            <circle
                                cx={centerX}
                                cy={centerY}
                                r="78"
                                fill="url(#centerGlassGradient)"
                                opacity="0.8"
                            />

                            {/* ShipCrowd logo */}
                            <foreignObject
                                x={centerX - 55}
                                y={centerY - 55}
                                width="110"
                                height="110"
                            >
                                <div className="w-full h-full flex items-center justify-center">
                                    <motion.img
                                        src="/logos/Shipcrowd-logo.png"
                                        alt="ShipCrowd"
                                        className="w-full h-full object-contain"
                                        animate={{
                                            filter: [
                                                'drop-shadow(0 0 0px rgba(37,37,255,0))',
                                                'drop-shadow(0 0 8px rgba(37,37,255,0.3))',
                                                'drop-shadow(0 0 0px rgba(37,37,255,0))'
                                            ]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
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
