'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function Navigation() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Track', href: '/track' },
        { name: 'Ship', href: '/ship' },
    ];

    return (
        <>
            <motion.nav
                className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled
                    ? 'bg-white/80 backdrop-blur-md py-4 border-b border-gray-100 shadow-sm'
                    : 'bg-transparent py-6'
                    }`}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className="container mx-auto px-6 md:px-12 max-w-[1400px] flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group relative z-50">
                        <div className="relative w-36 h-10 transition-transform duration-300 group-hover:scale-105">
                            <Image
                                src="/logos/Helix-logo.png"
                                alt="Helix Logo"
                                fill
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-sm font-semibold text-gray-600 hover:text-[#2525FF] transition-colors relative group"
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2525FF] transition-[width] duration-300 group-hover:w-full rounded-full" />
                            </Link>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-sm font-bold text-gray-700 hover:text-[#2525FF] transition-colors px-4 py-2"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/signup"
                            className="bg-[#2525FF] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Get Started
                        </Link>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden text-gray-900 hover:text-[#2525FF] transition-colors p-2 z-50"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? "Close Menu" : "Open Menu"}
                    >
                        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[90] bg-white flex flex-col md:hidden pt-24"
                    >
                        <div className="flex flex-col flex-1 overflow-y-auto px-6 py-4">
                            <div className="flex flex-col gap-1">
                                {navLinks.map((link, i) => (
                                    <motion.div
                                        key={link.name}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Link
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center justify-between text-2xl font-bold text-gray-900 py-5 border-b border-gray-100 group"
                                        >
                                            <span className="group-hover:text-[#2525FF] transition-colors">{link.name}</span>
                                            <ChevronRight size={20} className="text-gray-400 group-hover:text-[#2525FF] transition-colors" />
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-auto pb-8 pt-6 flex flex-col gap-4"
                            >
                                <button className="w-full py-4 rounded-xl border-2 border-gray-200 font-bold text-gray-900 hover:bg-gray-50 hover:border-gray-300 transition-all">
                                    Log in
                                </button>
                                <button className="w-full py-4 rounded-xl bg-[#2525FF] text-white font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
                                    Get Started
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
