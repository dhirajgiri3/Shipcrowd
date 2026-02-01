'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Twitter,
    Linkedin,
    Facebook,
    Instagram,
    ArrowRight,
    Send,
    Check,
    Globe,
    ShieldCheck,
    Heart
} from 'lucide-react';

interface FooterLink {
    name: string;
    href: string;
    badge?: string;
}

const footerLinks: Record<string, FooterLink[]> = {
    Product: [
        { name: 'Features', href: '/#features' },
        { name: 'Integrations', href: '/integrations' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'API Reference', href: '/developers' },
        { name: 'Track Shipment', href: '/track' },
    ],
    Company: [
        { name: 'About Us', href: '/about' },
        { name: 'Careers', href: '/careers', badge: 'Hiring' },
        { name: 'Blog', href: '/blog' },
        { name: 'Contact', href: '/contact' },
        { name: 'Partners', href: '/partners' },
    ],
    Resources: [
        { name: 'Documentation', href: '/docs' },
        { name: 'Help Center', href: '/help' },
        { name: 'Community', href: '/community' },
        { name: 'Status', href: '/status' },
    ],
    Legal: [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Cookie Policy', href: '/cookies' },
        { name: 'Security', href: '/security' },
    ],
};

function NewsletterForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        // Simulate API call
        setTimeout(() => {
            setStatus('success');
            setEmail('');
            setTimeout(() => setStatus('idle'), 3000);
        }, 1500);
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
            <div className={`relative group flex items-center bg-[var(--bg-secondary)] border transition-all duration-300 rounded-xl overflow-hidden ${status === 'success' ? 'border-[var(--success)]' : 'border-[var(--border-default)] focus-within:border-[var(--primary-blue)] focus-within:shadow-[0_0_0_3px_var(--primary-blue-soft)]'
                }`}>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your work email"
                    disabled={status !== 'idle'}
                    className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={status !== 'idle' || !email}
                    className={`px-4 py-3 flex items-center justify-center transition-all duration-300 ${status === 'success'
                        ? 'text-[var(--success)] bg-[var(--success-bg)]'
                        : 'text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] disabled:opacity-50 disabled:hover:bg-transparent'
                        }`}
                >
                    <AnimatePresence mode="wait">
                        {status === 'loading' ? (
                            <motion.div
                                key="loader"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
                            />
                        ) : status === 'success' ? (
                            <motion.div
                                key="success"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <Check size={18} strokeWidth={2.5} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="send"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <Send size={18} strokeWidth={2} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-tertiary)] pl-1">
                Join 10,000+ logistics leaders. No spam, ever.
            </p>
        </form>
    );
}

export function Footer() {
    return (
        <footer className="relative bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[var(--primary-blue)]/5 rounded-full blur-[120px] -translate-y-1/2" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] translate-y-1/2" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
            </div>

            <div className="container mx-auto px-4 pt-20 pb-10 relative z-10">
                {/* Top Section: CTA & Newsletter */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
                    <div className="lg:col-span-5">
                        <Link href="/" className="inline-block mb-6 group">
                            <div className="flex items-center gap-2">
                                <div className="relative w-32 h-12">
                                    <Image
                                        src="https://res.cloudinary.com/divbobkmd/image/upload/v1769869575/Shipcrowd-logo_utcmu0.png"
                                        alt="Shipcrowd Logo"
                                        fill
                                        className="object-contain rounded-full"
                                    />
                                </div>
                            </div>
                        </Link>
                        <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-md">
                            The smartest shipping aggregator for modern e-commerce. <br />
                            <span className="text-[var(--text-primary)] font-medium">Ship smarter, faster, and cheaper.</span>
                        </p>
                        <div className="flex gap-4">
                            {[
                                { icon: Twitter, href: '#' },
                                { icon: Linkedin, href: '#' },
                                { icon: Facebook, href: '#' },
                                { icon: Instagram, href: '#' }
                            ].map((social, i) => (
                                <motion.a
                                    key={i}
                                    href={social.href}
                                    whileHover={{ y: -3, backgroundColor: 'var(--primary-blue-soft)', color: 'var(--primary-blue)' }}
                                    className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] transition-colors"
                                >
                                    <social.icon size={18} strokeWidth={2} />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-7 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">
                        {/* Newsletter Callout */}
                        <div className="lg:ml-auto bg-[var(--bg-secondary)]/50 backdrop-blur-sm p-8 rounded-2xl border border-[var(--border-subtle)] w-full max-w-lg">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                                Stay ahead of the curve
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-6">
                                Get the latest logistics trends, shipping strategies, and platform updates delivered to your inbox.
                            </p>
                            <NewsletterForm />
                        </div>
                    </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent mb-16" />

                {/* Main Links Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-20">
                    {Object.entries(footerLinks).map(([category, links], catIdx) => (
                        <div key={category}>
                            <h4 className="font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                                {category}
                            </h4>
                            <ul className="space-y-4">
                                {links.map((link, linkIdx) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.href}
                                            className="group flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors text-sm font-medium w-fit"
                                        >
                                            <span className="relative">
                                                {link.name}
                                                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[var(--primary-blue)] transition-all duration-300 group-hover:w-full" />
                                            </span>
                                            {link.badge && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-[10px] font-bold uppercase tracking-wide">
                                                    {link.badge}
                                                </span>
                                            )}
                                            <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-[var(--primary-blue)]" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-[var(--border-subtle)]">
                    <p className="text-sm text-[var(--text-tertiary)] flex items-center gap-1">
                        © {new Date().getFullYear()} Shipcrowd India.
                        <span className="hidden sm:inline">All rights reserved.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            All systems normal
                        </div>

                        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                            <span>Made with</span>
                            <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" />
                            <span>in India</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
