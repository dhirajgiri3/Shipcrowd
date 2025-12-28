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
                    ? 'bg-[var(--bg-elevated)]/80 backdrop-blur-md py-4'
                    : 'bg-transparent py-6'
                    }`}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className="container mx-auto px-4 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group relative">
                        <div className="relative w-32 h-10 transition-transform duration-300 group-hover:scale-105">
                            <Image
                                src="/logos/Shipcrowd-logo.png"
                                alt="ShipCrowd Logo"
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
                                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors relative group"
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--primary-blue)] transition-[width] duration-300 group-hover:w-full" />
                            </Link>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <button className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            Log in
                        </button>
                        <button className="bg-[var(--primary-blue)] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[var(--primary-blue-deep)] hover:text-white transition-all shadow-lg hover:shadow-[var(--shadow-brand)] hover:-translate-y-0.5 active:translate-y-0">
                            Get Started
                        </button>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden text-[var(--text-primary)] hover:text-[var(--primary-blue)] transition-colors p-2"
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Open Request Menu"
                    >
                        <Menu size={24} />
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
                        className="fixed inset-0 z-[110] bg-[var(--bg-primary)] flex flex-col md:hidden"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
                            <div className="relative w-28 h-8">
                                <Image
                                    src="/logos/Shipcrowd-logo.png"
                                    alt="ShipCrowd Logo"
                                    fill
                                    className="object-contain object-left"
                                />
                            </div>
                            <button
                                className="p-2 bg-[var(--bg-secondary)] rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                                aria-label="Close Menu"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex flex-col flex-1 overflow-y-auto px-6 py-8">
                            <div className="flex flex-col gap-2">
                                {navLinks.map((link, i) => (
                                    <motion.div
                                        key={link.name}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                    >
                                        <Link
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center justify-between text-xl font-bold text-[var(--text-primary)] py-4 border-b border-[var(--border-subtle)] group"
                                        >
                                            <span className="group-hover:text-[var(--primary-blue)] transition-colors">{link.name}</span>
                                            <ChevronRight size={20} className="text-[var(--text-tertiary)] group-hover:text-[var(--primary-blue)] transition-colors" />
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mt-auto pt-8 flex flex-col gap-4"
                            >
                                <button className="w-full py-4 rounded-xl border border-[var(--border-default)] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                                    Log in
                                </button>
                                <button className="w-full py-4 rounded-xl bg-[var(--primary-blue)] text-white font-bold shadow-[var(--shadow-brand)] hover:scale-[1.02] active:scale-[0.98] transition-all">
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
