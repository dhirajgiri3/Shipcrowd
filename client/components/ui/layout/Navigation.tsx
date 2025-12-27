'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight, User, Package } from 'lucide-react';
import Link from 'next/link';

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
        { name: 'Track', href: '/track' },
        { name: 'Ship', href: '/ship' },
        { name: 'Enterprise', href: '/enterprise' },
        { name: 'Developers', href: '/developers' },
    ];

    return (
        <>
            <motion.nav
                className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled
                        ? 'bg-[var(--bg-elevated)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] py-4'
                        : 'bg-transparent py-6'
                    }`}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className="container mx-auto px-4 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary-blue)] flex items-center justify-center text-white shadow-[var(--shadow-brand)] group-hover:scale-105 transition-transform">
                            <Package size={20} strokeWidth={2.5} />
                        </div>
                        <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            Ship<span className="text-[var(--primary-blue)]">crowd</span>
                        </span>
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
                        <button className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[var(--primary-blue)] hover:text-white transition-all shadow-lg hover:shadow-[var(--shadow-brand)]">
                            Get Started
                        </button>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden text-[var(--text-primary)]"
                        onClick={() => setMobileMenuOpen(true)}
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
                        className="fixed inset-0 z-[110] bg-[var(--bg-primary)] flex flex-col pt-24 px-6 md:hidden"
                    >
                        <button
                            className="absolute top-6 right-6 p-2 bg-[var(--bg-secondary)] rounded-full text-[var(--text-primary)]"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <X size={24} />
                        </button>

                        <div className="flex flex-col gap-6">
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
                                        className="flex items-center justify-between text-2xl font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-4"
                                    >
                                        {link.name}
                                        <ChevronRight size={20} className="text-[var(--text-tertiary)]" />
                                    </Link>
                                </motion.div>
                            ))}

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mt-8 flex flex-col gap-4"
                            >
                                <button className="w-full py-4 rounded-xl border border-[var(--border-default)] font-bold text-[var(--text-primary)]">
                                    Log in
                                </button>
                                <button className="w-full py-4 rounded-xl bg-[var(--primary-blue)] text-white font-bold shadow-[var(--shadow-brand)]">
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
