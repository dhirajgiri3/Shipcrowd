"use client"

import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import { ArrowRight, TrendingUp, ShieldCheck, Truck, Home, Settings, CreditCard, LayoutGrid, ChevronDown, Plus, MoreHorizontal, Search, Bell, Package, Users, BarChart3, Activity } from "lucide-react"
import { Button } from '@/src/components/ui/core/Button'
import {
    LazyAreaChart as AreaChart,
    LazyArea as Area,
    LazyLineChart as LineChart,
    LazyLine as Line,
    LazyComposedChart as ComposedChart,
    LazyBar as Bar,
    LazyXAxis as XAxis,
    LazyYAxis as YAxis,
    LazyCartesianGrid as CartesianGrid,
    LazyTooltip as Tooltip,
    LazyResponsiveContainer as ResponsiveContainer
} from '@/src/components/features/charts/LazyCharts';
import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'
import { useState, useEffect } from 'react'

const data = [
    { name: 'Mon', value: 4000 },
    { name: 'Tue', value: 3000 },
    { name: 'Wed', value: 5000 },
    { name: 'Thu', value: 2780 },
    { name: 'Fri', value: 1890 },
    { name: 'Sat', value: 2390 },
    { name: 'Sun', value: 3490 },
];

const smallChartData = [
    { value: 10 }, { value: 25 }, { value: 15 }, { value: 35 }, { value: 20 }, { value: 45 }, { value: 30 }
]

const GridBackground = ({ inView }: { inView: boolean }) => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#F8FAFC]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#E2E8F0_1px,transparent_1px),linear-gradient(to_bottom,#E2E8F0_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-40" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_50%,transparent,white)]" />

            {/* Subtle Animated Highlight */}
            <motion.div
                animate={inView ? { opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primaryBlue/5 rounded-full blur-[100px]"
            />
        </div>
    )
}

export default function Hero() {
    const { scrollY } = useScroll()
    const [ref, inView] = useInView({ triggerOnce: false, threshold: 0 })
    const [hasAnimated, setHasAnimated] = useState(false)

    useEffect(() => {
        if (inView && !hasAnimated) {
            setHasAnimated(true)
        }
    }, [inView, hasAnimated])

    // Mouse parallax effect
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Smooth spring animation for mouse movement
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3, -3]), { stiffness: 150, damping: 20 })
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3, 3]), { stiffness: 150, damping: 20 })

    useEffect(() => {
        if (!inView) return;

        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e
            const { innerWidth, innerHeight } = window

            // Normalize mouse position to -0.5 to 0.5
            const x = (clientX / innerWidth) - 0.5
            const y = (clientY / innerHeight) - 0.5

            mouseX.set(x)
            mouseY.set(y)
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [mouseX, mouseY, inView])

    // Enhanced parallax for scroll
    const dashboardY = useTransform(scrollY, [0, 600], [0, 100])
    const floatingCard1Y = useTransform(scrollY, [0, 600], [0, -40])
    const floatingCard2Y = useTransform(scrollY, [0, 600], [0, -70])
    const floatingCard3Y = useTransform(scrollY, [0, 600], [0, -50])

    return (
        <section ref={ref} className="relative min-h-screen flex items-center pt-[72px] overflow-hidden bg-[#F8FAFC]">
            {/* Premium Animated Grid Background */}
            <GridBackground inView={inView} />

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                <div className="grid lg:grid-cols-[40%_60%] gap-12 items-center">
                    {/* Left Content - Aesthetic & Minimalist */}
                    <div className="relative z-10 pt-10 lg:pt-0">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="mb-6"
                        >
                            <div className="inline-flex items-center py-1.5 px-4 rounded-full bg-primaryBlue/5 ring-1 ring-primaryBlue/20">
                                <span className="relative flex h-2 w-2 mr-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primaryBlue opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primaryBlue"></span>
                                </span>
                                <span className="text-primaryBlue text-[11px] font-bold tracking-widest uppercase">
                                    AI-Powered Shipping Intelligence
                                </span>
                            </div>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                            className="text-5xl md:text-6xl lg:text-[64px] font-bold leading-[1.05] tracking-tight text-[#0F172A] mb-8 relative z-10"
                        >
                            <span className="relative inline-block">
                                Ship Smarter,
                            </span> <br />
                            <span className="relative inline-block">
                                <span className="relative z-10 text-primaryBlue">Not Harder.</span>
                                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primaryBlue/20 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                                </svg>
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="text-lg text-slate-600 leading-relaxed max-w-[480px] mb-10 font-medium"
                        >
                            One platform to manage 15+ couriers. Automate 90% of your workflow and save up to 25% on shipping costs with AI-driven optimization.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="flex flex-col sm:flex-row gap-4 mb-12"
                        >
                            <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                                <Button size="lg" className="h-[52px] px-8 text-[15px] font-semibold bg-primaryBlue hover:bg-primaryBlue/90 shadow-[0_8px_20px_-6px_rgba(37,37,255,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(37,37,255,0.5)] transition-all duration-300 rounded-xl">
                                    Start Shipping Free
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                                <Button variant="outline" size="lg" className="h-[52px] px-8 text-[15px] font-semibold border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition-all duration-300">
                                    Book a Demo
                                </Button>
                            </motion.div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className="flex flex-wrap gap-x-8 gap-y-3 text-xs font-medium text-slate-500"
                        >
                            {["No credit card required", "5-minute setup", "Cancel anytime"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-emerald/10 flex items-center justify-center text-emerald">
                                        <ShieldCheck size={10} strokeWidth={3} />
                                    </div>
                                    {item}
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right Visual - Interactive Dashboard */}
                    <div className="relative hidden lg:block h-[540px] w-full mr-[25%]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                y: dashboardY,
                                rotateX,
                                rotateY,
                                transformStyle: "preserve-3d"
                            }}
                            className="relative z-10 w-full h-full flex items-center origin-center perspective-[2500px]"
                        >
                            {/* Main Dashboard Container */}
                            <motion.div
                                style={{
                                    transformStyle: "preserve-3d",
                                    transform: "perspective(1000px)"
                                }}
                                className="relative w-[900px] h-[480px] bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-[0_50px_100px_-20px_rgba(37,99,235,0.2),0_30px_60px_-30px_rgba(37,99,235,0.25),inset_0_0_0_1px_rgba(255,255,255,0.8)] p-5 overflow-hidden border border-white/50"
                            >

                                {/* Top Navigation Bar */}
                                <div className="flex items-center justify-between mb-5 pl-60 pr-2">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-lg font-bold text-slate-800">Overview</h3>
                                        <div className="h-5 w-px bg-slate-200" />
                                        <div className="flex items-center gap-2 bg-emerald/10 px-2 py-1 rounded-full">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Live</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm hover:text-primaryBlue hover:border-primaryBlue/30 transition-colors cursor-pointer">
                                            <Search size={14} />
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm hover:text-primaryBlue hover:border-primaryBlue/30 transition-colors cursor-pointer relative">
                                            <Bell size={14} />
                                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 border-2 border-white rounded-full" />
                                        </motion.div>
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primaryBlue to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-md ring-2 ring-white ml-2">
                                            JD
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar */}
                                <div className="absolute left-0 top-0 bottom-0 w-60 border-r border-slate-100 px-4 py-6 flex flex-col gap-1 bg-white/40 backdrop-blur-xl">
                                    {/* Logo */}
                                    <div className="flex items-center gap-3 text-slate-900 font-bold text-base px-3 mb-6">
                                        <img
                                            src="https://res.cloudinary.com/divbobkmd/image/upload/v1769869575/Shipcrowd-logo_utcmu0.png"
                                            alt="Shipcrowd"
                                            className="h-6 w-auto object-contain rounded-full"
                                        />
                                    </div>

                                    {/* Navigation */}
                                    <nav className="flex-1 space-y-0.5">
                                        <div
                                            className="flex items-center w-[150px] gap-3 px-3 py-2.5 text-primaryBlue rounded-lg font-semibold text-xs"
                                        >
                                            <Home size={16} strokeWidth={2.5} />
                                            <span>Dashboard</span>
                                        </div>

                                        {[
                                            { icon: Package, label: "Shipments" },
                                            { icon: BarChart3, label: "Analytics" },
                                            { icon: Users, label: "Customers" },
                                            { icon: LayoutGrid, label: "Orders" },
                                            { icon: Truck, label: "Carriers" },
                                            { icon: CreditCard, label: "Billing" },
                                            { icon: Activity, label: "Reports" },
                                            { icon: Settings, label: "Settings" }
                                        ].map((item, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.6 + i * 0.03 }}
                                                className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-primaryBlue rounded-lg font-medium text-xs transition-all cursor-pointer group"
                                            >
                                                <item.icon size={16} strokeWidth={2} className="group-hover:text-primaryBlue transition-colors" />
                                                <span>{item.label}</span>
                                            </motion.div>
                                        ))}
                                    </nav>

                                    {/* Sidebar Bottom Card - Centered and Modern */}
                                    <motion.div
                                        whileHover={{ y: -3 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                        className="bg-gradient-to-br w-[150px] from-[#0F172A] to-[#1E293B] rounded-xl p-4 text-white relative overflow-hidden cursor-pointer flex items-center justify-center"
                                    >
                                        <div className="relative z-10 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="text-[10px] font-medium opacity-70">Pro Plan</div>
                                                <div className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">PRO</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Main Content */}
                                <div className="ml-60 pl-4 h-full flex flex-col">
                                    {/* Carrier Logos Row */}
                                    <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar mask-linear-fade flex-shrink-0">
                                        {[
                                            { name: "Delhivery", logo: "/logos/delhivery.png" },
                                            { name: "BlueDart", logo: "/logos/blue-dart.png" },
                                            { name: "DHL", logo: "/logos/dhl.png" },
                                            { name: "FedEx", logo: "/logos/fedex.png" },
                                            { name: "DTDC", logo: "/logos/dtdc.png" },
                                            { name: "Ecom Express", logo: "/logos/ecom-express.png" },
                                            { name: "Ekart", logo: "/logos/ekart.png" },
                                            { name: "XpressBees", logo: "/logos/xpressbees.png" },
                                            { name: "Shadowfax", logo: "/logos/shadowfax.png" },
                                            { name: "India Post", logo: "/logos/india-post.png" }
                                        ].map((carrier, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.8 + i * 0.05, type: "spring", stiffness: 200 }}
                                                whileHover={{ y: -2, scale: 1.05 }}
                                                className="w-11 h-11 rounded-lg bg-white shadow-sm flex-shrink-0 flex items-center justify-center cursor-pointer ring-1 ring-slate-100 hover:ring-2 hover:ring-primaryBlue/40 hover:shadow-md transition-all duration-300 overflow-hidden p-2"
                                                title={carrier.name}
                                            >
                                                <img
                                                    src={carrier.logo}
                                                    alt={carrier.name}
                                                    className="w-full h-full object-contain transition-transform duration-300 hover:scale-110"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.parentElement!.style.backgroundColor = '#f1f5f9';
                                                        e.currentTarget.parentElement!.innerText = carrier.name[0];
                                                    }}
                                                />
                                            </motion.div>
                                        ))}
                                        <motion.button
                                            whileHover={{ scale: 1.05, y: -2, borderColor: "#2525FF", backgroundColor: "rgba(37,37,255,0.05)" }}
                                            whileTap={{ scale: 0.95 }}
                                            className="w-11 h-11 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-primaryBlue transition-all duration-300 bg-white cursor-pointer"
                                        >
                                            <Plus size={16} />
                                        </motion.button>
                                    </div>

                                    {/* Dashboard Grid */}
                                    <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 pb-4">
                                        {/* Main Chart - Composed Bar + Line */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 1, duration: 0.6 }}
                                            whileHover={{ y: -2 }}
                                            className="col-span-8 bg-white/90 backdrop-blur-sm rounded-[18px] p-4 border border-slate-100 flex flex-col relative overflow-hidden group"
                                        >
                                            {/* Subtle gradient overlay on hover */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-primaryBlue/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                            <div className="flex justify-between items-center mb-3 flex-shrink-0 relative z-10">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                        Shipment Analytics
                                                        <motion.span
                                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                                            transition={{ duration: 2, repeat: Infinity }}
                                                            className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                                                        />
                                                    </h4>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">Volume & Performance Trends</div>
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.05, backgroundColor: "#f1f5f9" }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 transition-colors border border-slate-100/50"
                                                >
                                                    Weekly <ChevronDown size={10} />
                                                </motion.button>
                                            </div>

                                            <div className="flex-1 w-full min-h-[200px] relative -ml-4">
                                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                                    <ComposedChart data={data}>
                                                        <defs>
                                                            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#2525FF" stopOpacity={0.9} />
                                                                <stop offset="95%" stopColor="#2525FF" stopOpacity={0.4} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis
                                                            dataKey="name"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                            dy={8}
                                                        />
                                                        <YAxis hide={true} />
                                                        <Tooltip
                                                            contentStyle={{
                                                                borderRadius: '12px',
                                                                border: '1px solid #e2e8f0',
                                                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                                fontSize: '11px',
                                                                backgroundColor: '#ffffff',
                                                                padding: '8px 12px',
                                                                fontWeight: 600,
                                                                color: '#0f172a'
                                                            }}
                                                            labelStyle={{ color: '#64748b', fontWeight: 500, marginBottom: '2px' }}
                                                        />
                                                        <Bar
                                                            dataKey="value"
                                                            fill="url(#colorBar)"
                                                            radius={[6, 6, 0, 0]}
                                                            isAnimationActive={true}
                                                            animationDuration={1200}
                                                            animationEasing="ease-out"
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="value"
                                                            stroke="#10B981"
                                                            strokeWidth={2.5}
                                                            dot={{ fill: '#10B981', r: 4 }}
                                                            activeDot={{ r: 6 }}
                                                            isAnimationActive={true}
                                                            animationDuration={1500}
                                                            animationEasing="ease-out"
                                                        />
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </motion.div>

                                        {/* Right Column */}
                                        <div className="col-span-4 flex flex-col gap-4">
                                            {/* Orders Today Card */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 1.1, duration: 0.6 }}
                                                whileHover={{ y: -2, borderColor: "rgba(37,37,255,0.15)" }}
                                                className="bg-white/90 backdrop-blur-sm rounded-[18px] p-4 border border-slate-100 transition-all flex-1"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <div className="text-[10px] text-slate-500 font-medium">Orders today</div>
                                                        <div className="text-2xl font-bold text-slate-900">
                                                            {hasAnimated && <CountUp end={1247} duration={2} separator="," />}
                                                        </div>
                                                    </div>
                                                    <div className="w-7 h-7 rounded-lg bg-emerald/10 flex items-center justify-center text-emerald">
                                                        <Activity size={14} />
                                                    </div>
                                                </div>
                                                <div className="h-10 w-full min-h-[40px]">
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                                        <LineChart data={smallChartData}>
                                                            <Line
                                                                type="monotone"
                                                                dataKey="value"
                                                                stroke="#10B981"
                                                                strokeWidth={2}
                                                                dot={false}
                                                                isAnimationActive={true}
                                                                animationDuration={1600}
                                                                animationEasing="ease-out"
                                                            />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </motion.div>

                                            {/* Settlement Card */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 1.2, duration: 0.6 }}
                                                whileHover={{ y: -2 }}
                                                className="bg-white/90 backdrop-blur-sm rounded-[18px] p-4 border border-slate-100 relative overflow-hidden flex-1"
                                            >
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div>
                                                            <div className="text-[10px] text-slate-500 font-medium">Settlement</div>
                                                            <div className="text-2xl font-bold text-slate-900">
                                                                ₹{hasAnimated && <CountUp end={2675} duration={2.2} separator="," />}
                                                            </div>
                                                        </div>
                                                        <div className="w-7 h-7 rounded-lg bg-primaryBlue/10 flex items-center justify-center text-primaryBlue">
                                                            <CreditCard size={14} />
                                                        </div>
                                                    </div>
                                                    <div className="h-8 w-full min-h-[32px]">
                                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                                            <LineChart data={smallChartData}>
                                                                <Line
                                                                    type="monotone"
                                                                    dataKey="value"
                                                                    stroke="#2563EB"
                                                                    strokeWidth={2}
                                                                    dot={false}
                                                                    isAnimationActive={true}
                                                                    animationDuration={1700}
                                                                    animationEasing="ease-out"
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primaryBlue/5 rounded-full blur-xl" />
                                            </motion.div>

                                            {/* Ready to Ship */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 1.3, duration: 0.6 }}
                                                whileHover={{ y: -2 }}
                                                className="bg-white/90 backdrop-blur-sm rounded-[18px] p-4 border border-slate-100 flex-1 flex flex-col justify-center"
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="text-[10px] text-slate-500 font-medium">Ready to Ship</div>
                                                    <div className="text-[10px] font-bold text-emerald">+5%</div>
                                                </div>
                                                <div className="text-2xl font-bold text-slate-900 mb-2">
                                                    {hasAnimated && <CountUp end={279} duration={2.4} />}
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: "70%" }}
                                                        transition={{ delay: 1.5, duration: 1, ease: "easeOut" }}
                                                        className="h-full bg-gradient-to-r from-primaryBlue to-indigo-500 rounded-full"
                                                    />
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating Stats Cards */}

                            {/* Left Floating Card: Saved This Month */}
                            <motion.div
                                initial={{ opacity: 0, x: -40, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                transition={{ delay: 1.4, duration: 0.8, type: "spring", stiffness: 200 }}
                                style={{ y: floatingCard1Y }}
                                className="absolute top-[40%] -left-[40px] bg-white p-4 rounded-[20px] shadow-[0_20px_50px_-10px_rgba(37,99,235,0.15)] border border-slate-100 flex items-center gap-4 z-30 min-w-[200px] cursor-default"
                            >
                                <div className="w-10 h-10 bg-emerald/10 rounded-xl flex items-center justify-center text-emerald shadow-sm">
                                    <ShieldCheck size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900 leading-none mb-0.5">
                                        ₹{hasAnimated && <CountUp end={2.4} decimals={1} duration={2.5} />}L
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium">Saved This Month</div>
                                </div>
                            </motion.div>

                            {/* Top Right Floating Card: Orders Today */}
                            <motion.div
                                initial={{ opacity: 0, y: -40, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                transition={{ delay: 1.5, duration: 0.8, type: "spring", stiffness: 200 }}
                                style={{ y: floatingCard2Y }}
                                className="absolute top-6 right-8 bg-white p-4 rounded-[20px] shadow-[0_20px_50px_-10px_rgba(37,99,235,0.15)] border border-slate-100 z-30 min-w-[160px] cursor-default"
                            >
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <div className="text-2xl font-bold text-slate-900 leading-none">
                                        {hasAnimated && <CountUp end={1247} duration={2.6} separator="," />}
                                    </div>
                                    <div className="px-1.5 py-0.5 bg-emerald/10 text-emerald text-[9px] font-bold rounded-md flex items-center gap-1">
                                        <TrendingUp size={10} strokeWidth={3} /> Top
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">Orders Today</div>
                            </motion.div>

                            {/* Bottom Center Floating Card: Couriers Connected */}
                            <motion.div
                                initial={{ opacity: 0, y: 40, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                transition={{ delay: 1.6, duration: 0.8, type: "spring", stiffness: 200 }}
                                style={{ y: floatingCard3Y }}
                                className="absolute bottom-12 left-[25%] bg-white p-4 rounded-[20px] shadow-[0_20px_50px_-10px_rgba(37,99,235,0.15)] border border-slate-100 flex items-center gap-4 z-30 min-w-[220px] cursor-default"
                            >
                                <div className="w-10 h-10 bg-primaryBlue/10 rounded-xl flex items-center justify-center text-primaryBlue shadow-sm">
                                    <Truck size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900 leading-none mb-0.5">
                                        {hasAnimated && <CountUp end={15} duration={2.7} />}+
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium">Couriers Connected</div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}
