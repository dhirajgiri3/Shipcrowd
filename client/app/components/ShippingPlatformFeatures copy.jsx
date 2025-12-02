"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Globe, Zap, BarChart3, Wallet, Box, Code2,
    ArrowRight, CheckCircle2, AlertCircle, TrendingUp,
    Shield, Smartphone, Layers, Truck, Plane, Map
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// --- Components ---

const ShippingPlatformFeatures = () => {
    return (
        <section className="relative w-full bg-slate-50 py-32 px-4 sm:px-6 lg:px-8 overflow-hidden selection:bg-blue-100 selection:text-blue-900">

            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-100/30 rounded-full blur-[80px]" />
                {/* Noise Texture using CSS radial gradient for a subtle effect */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            </div>

            <div className="relative max-w-7xl mx-auto z-10">

                {/* Section Header */}
                <div className="max-w-3xl mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                            <span className="text-sm font-bold tracking-widest text-blue-600 uppercase">
                                Platform Features
                            </span>
                        </div>

                        <h2 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-8">
                            Shipping infrastructure for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">modern era</span>.
                        </h2>

                        <p className="text-xl text-slate-600 leading-relaxed max-w-2xl">
                            A complete suite of tools designed to automate, optimize, and scale your logistics operations from day one.
                        </p>
                    </motion.div>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 auto-rows-[minmax(300px,auto)]">

                    {/* 1. Global Network (Large) */}
                    <BentoCard className="md:col-span-6 lg:col-span-8 min-h-[400px]">
                        <CardContent
                            icon={<Globe className="w-6 h-6 text-blue-500" />}
                            title="Global Courier Network"
                            description="Access 15+ carrier partners and reach 29,000+ pincodes instantly."
                        >
                            <NetworkMap />
                        </CardContent>
                    </BentoCard>

                    {/* 2. AI Routing (Tall) */}
                    <BentoCard className="md:col-span-6 lg:col-span-4 min-h-[400px]">
                        <CardContent
                            icon={<Zap className="w-6 h-6 text-amber-500" />}
                            title="Smart Routing AI"
                            description="Automatically select the fastest and cheapest courier for every shipment."
                        >
                            <SmartRoutingUI />
                        </CardContent>
                    </BentoCard>

                    {/* 3. Analytics (Medium) */}
                    <BentoCard className="md:col-span-6 lg:col-span-4">
                        <CardContent
                            icon={<BarChart3 className="w-6 h-6 text-emerald-500" />}
                            title="Real-time Analytics"
                            description="Deep insights into delivery performance and shipping costs."
                        >
                            <AnalyticsGraph />
                        </CardContent>
                    </BentoCard>

                    {/* 4. Reconciliation (Medium) */}
                    <BentoCard className="md:col-span-6 lg:col-span-4">
                        <CardContent
                            icon={<Wallet className="w-6 h-6 text-indigo-500" />}
                            title="COD Reconciliation"
                            description="Automated payment tracking and discrepancy detection."
                        >
                            <ReconciliationUI />
                        </CardContent>
                    </BentoCard>

                    {/* 5. Warehouse (Medium) */}
                    <BentoCard className="md:col-span-6 lg:col-span-4">
                        <CardContent
                            icon={<Box className="w-6 h-6 text-orange-500" />}
                            title="Warehouse Ops"
                            description="Streamlined pick, pack, and ship workflows."
                        >
                            <WarehouseUI />
                        </CardContent>
                    </BentoCard>

                    {/* 6. Developer API (Wide) */}
                    <BentoCard className="md:col-span-12 lg:col-span-12 min-h-[300px] bg-slate-900 text-white border-slate-800">
                        <div className="flex flex-col lg:flex-row h-full">
                            <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-6">
                                    <Code2 className="w-6 h-6 text-blue-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Developer-First API</h3>
                                <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-md">
                                    Build custom shipping flows with our robust, well-documented API. Webhooks, tracking streams, and more.
                                </p>
                                <div className="flex gap-4">
                                    <button className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">
                                        Read Documentation
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-950/50 border-t lg:border-t-0 lg:border-l border-slate-800 relative overflow-hidden">
                                <CodeBlock />
                            </div>
                        </div>
                    </BentoCard>

                </div>
            </div>
        </section>
    );
};

// --- Sub-Components ---

const BentoCard = ({ children, className }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
            "group relative rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300",
            className
        )}
    >
        {children}
    </motion.div>
);

const CardContent = ({ icon, title, description, children }) => (
    <div className="flex flex-col h-full p-8">
        <div className="flex flex-col gap-4 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {title}
                </h3>
                <p className="text-slate-500 leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
        <div className="flex-1 relative min-h-[160px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden group-hover:border-blue-100 transition-colors">
            {children}
        </div>
    </div>
);

// --- Visualizations ---

const NetworkMap = () => {
    return (
        <div className="absolute inset-0 w-full h-full">
            {/* Abstract Map Background */}
            <svg className="w-full h-full text-slate-200" fill="currentColor" viewBox="0 0 400 200">
                <path d="M50,80 Q80,60 120,90 T200,80 T300,100 T380,80" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                <path d="M40,120 Q90,140 150,110 T250,130 T350,110" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 4" />
            </svg>

            {/* Animated Nodes */}
            {[
                { x: '20%', y: '40%', delay: 0 },
                { x: '50%', y: '30%', delay: 1 },
                { x: '80%', y: '50%', delay: 2 },
                { x: '30%', y: '70%', delay: 1.5 },
                { x: '60%', y: '60%', delay: 0.5 },
            ].map((node, i) => (
                <motion.div
                    key={i}
                    className="absolute w-3 h-3"
                    style={{ left: node.x, top: node.y }}
                >
                    <motion.div
                        className="absolute inset-0 bg-blue-500 rounded-full opacity-20"
                        animate={{ scale: [1, 3, 1], opacity: [0.2, 0, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, delay: node.delay }}
                    />
                    <div className="absolute inset-0 bg-blue-600 rounded-full border-2 border-white shadow-md" />
                </motion.div>
            ))}

            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <motion.path
                    d="M 80 80 L 200 60 L 320 100"
                    stroke="#3B82F6"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="5 5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.4 }}
                    transition={{ duration: 2, delay: 0.5 }}
                />
            </svg>
        </div>
    );
};

const SmartRoutingUI = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % 3);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const couriers = [
        { name: 'BlueDart', price: '₹85', time: '1 Day', score: 98 },
        { name: 'Delhivery', price: '₹92', time: '2 Days', score: 85 },
        { name: 'XpressBees', price: '₹78', time: '3 Days', score: 72 },
    ];

    return (
        <div className="w-full max-w-[280px] flex flex-col gap-3 p-4">
            {couriers.map((courier, i) => {
                const isActive = i === activeIndex;
                return (
                    <motion.div
                        key={courier.name}
                        className={cn(
                            "relative p-3 rounded-xl border flex items-center justify-between transition-all duration-300",
                            isActive
                                ? "bg-white border-amber-200 shadow-lg scale-105 z-10"
                                : "bg-slate-50 border-slate-100 opacity-60 scale-95"
                        )}
                        animate={{
                            y: isActive ? 0 : 0,
                            scale: isActive ? 1.05 : 0.95,
                            opacity: isActive ? 1 : 0.6
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                isActive ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"
                            )}>
                                {courier.name[0]}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">{courier.name}</p>
                                <p className="text-[10px] text-slate-500">{courier.time}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">{courier.price}</p>
                            {isActive && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-[10px] font-bold text-amber-600 uppercase"
                                >
                                    Best Match
                                </motion.span>
                            )}
                        </div>
                        {isActive && (
                            <motion.div
                                layoutId="active-border"
                                className="absolute inset-0 rounded-xl border-2 border-amber-400 pointer-events-none"
                            />
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
};

const AnalyticsGraph = () => {
    return (
        <div className="w-full h-full p-6 flex flex-col justify-end">
            <div className="flex items-end justify-between gap-2 h-32">
                {[40, 70, 50, 90, 60, 80, 95].map((h, i) => (
                    <motion.div
                        key={i}
                        className="w-full bg-emerald-100 rounded-t-md relative group overflow-hidden"
                        initial={{ height: 0 }}
                        whileInView={{ height: `\${h}%` }}
                        transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                    >
                        <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-emerald-500/20 to-emerald-500/0" />
                        <motion.div
                            className="absolute top-0 left-0 right-0 h-1 bg-emerald-400"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: 1 + i * 0.1 }}
                        />
                    </motion.div>
                ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                <span>Mon</span>
                <span>Sun</span>
            </div>
        </div>
    );
};

const ReconciliationUI = () => {
    return (
        <div className="flex flex-col gap-3 w-full max-w-[240px]">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</span>
            </div>
            {[
                { label: 'Remitted', amount: '₹45,230', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                { label: 'Pending', amount: '₹12,400', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                { label: 'Disputed', amount: '₹1,200', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
            ].map((item, i) => (
                <motion.div
                    key={item.label}
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.2 }}
                    className={cn(
                        "flex justify-between items-center p-3 rounded-lg border",
                        item.bg, item.border
                    )}
                >
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", item.color.replace('text', 'bg'))} />
                        <span className={cn("text-xs font-bold", item.color)}>{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{item.amount}</span>
                </motion.div>
            ))}
        </div>
    );
};

const WarehouseUI = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="grid grid-cols-3 gap-3">
                {[...Array(9)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center"
                        initial={{ scale: 0, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{
                            delay: i * 0.1,
                            type: "spring",
                            stiffness: 200,
                            damping: 15
                        }}
                        whileHover={{ scale: 1.1, backgroundColor: '#FFF7ED', borderColor: '#F97316' }}
                    >
                        <Box className="w-5 h-5 text-orange-300" />
                    </motion.div>
                ))}
            </div>
            {/* Scanner Line */}
            <motion.div
                className="absolute w-[140px] h-[2px] bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                animate={{ top: ['20%', '80%', '20%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
};

const CodeBlock = () => {
    return (
        <div className="p-8 font-mono text-sm text-slate-300 overflow-hidden">
            <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                <div className="w-3 h-3 rounded-full bg-green-500/20" />
            </div>
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1 }}
            >
                <div className="text-purple-400">const <span className="text-blue-400">shipment</span> = <span className="text-purple-400">await</span> shipcrowd.<span className="text-yellow-400">createOrder</span>({'{'}</div>
                <div className="pl-4 text-slate-400">order_id: <span className="text-green-400">'ORD-2024-001'</span>,</div>
                <div className="pl-4 text-slate-400">customer: {'{'}</div>
                <div className="pl-8 text-slate-400">name: <span className="text-green-400">'John Doe'</span>,</div>
                <div className="pl-8 text-slate-400">phone: <span className="text-green-400">'+91 98765 43210'</span></div>
                <div className="pl-4 text-slate-400">{'}'},</div>
                <div className="pl-4 text-slate-400">items: [...]</div>
                <div className="text-purple-400">{'}'});</div>
                <br />
                <div className="text-slate-500">// Returns tracking details instantly</div>
                <div className="text-purple-400">console.<span className="text-yellow-400">log</span>(shipment.<span className="text-blue-400">tracking_url</span>);</div>
            </motion.div>
        </div>
    );
};

export default ShippingPlatformFeatures;