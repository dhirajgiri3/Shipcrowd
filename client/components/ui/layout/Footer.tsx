'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Twitter, Linkedin, Facebook, Instagram } from 'lucide-react';

export function Footer() {
    const footerLinks = {
        Product: ['Features', 'Integrations', 'Pricing', 'API Reference'],
        Company: ['About Us', 'Careers', 'Blog', 'Contact'],
        Resources: ['Documentation', 'Help Center', 'Partners', 'Status'],
        Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
    };

    return (
        <footer className="bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] pt-20 pb-10">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-6 group w-fit">
                            <div className="w-8 h-8 rounded-lg bg-[var(--primary-blue)] flex items-center justify-center text-white shadow-[var(--shadow-brand-sm)]">
                                <Package size={16} strokeWidth={2.5} />
                            </div>
                            <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                                Ship<span className="text-[var(--primary-blue)]">crowd</span>
                            </span>
                        </Link>
                        <p className="text-[var(--text-secondary)] leading-relaxed mb-8 max-w-sm">
                            The next-generation shipping aggregation platform for modern e-commerce. Track, ship, and grow with confidence.
                        </p>
                        <div className="flex gap-4">
                            {[Twitter, Linkedin, Facebook, Instagram].map((Icon, i) => (
                                <a
                                    key={i}
                                    href="#"
                                    className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--primary-blue-soft)] hover:text-[var(--primary-blue)] transition-colors"
                                >
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category} className="lg:col-span-1">
                            <h4 className="font-bold text-[var(--text-primary)] mb-6">{category}</h4>
                            <ul className="space-y-4">
                                {links.map((link) => (
                                    <li key={link}>
                                        <Link
                                            href="#"
                                            className="text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors text-sm font-medium"
                                        >
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-[var(--text-tertiary)]">
                        © {new Date().getFullYear()} Helix India. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        System Operational
                    </div>
                </div>
            </div>
        </footer>
    );
}
