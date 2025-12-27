"use client"

import Link from "next/link"
import { Facebook, Twitter, Instagram, Linkedin, Github, Mail, MapPin, Phone } from "lucide-react"

export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer
            className="relative transition-colors-smooth"
            style={{
                backgroundColor: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-default)',
            }}
        >
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Main Content */}
                <div className="py-16 md:py-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
                        {/* Brand Column - Spans 4 columns on large screens */}
                        <div className="lg:col-span-4">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 mb-6 group"
                                style={{ transition: 'transform 200ms var(--ease-out)' }}
                            >
                                <img
                                    src="/logos/Shipcrowd-logo.png"
                                    alt="ShipCrowd Logo"
                                    className="h-8 w-auto object-contain"
                                    style={{ transition: 'opacity 200ms var(--ease-out)' }}
                                />
                            </Link>
                            <p
                                className="text-sm leading-relaxed mb-8 max-w-sm"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Intelligent logistics for modern e-commerce. Ship faster, cheaper, and smarter with AI-powered solutions.
                            </p>

                            {/* Contact Info */}
                            <div className="space-y-3 mb-8">
                                <a
                                    href="mailto:hello@shipcrowd.com"
                                    className="flex items-center gap-3 text-sm group"
                                    style={{
                                        color: 'var(--text-tertiary)',
                                        transition: 'color 200ms var(--ease-out)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-brand)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                >
                                    <Mail size={16} />
                                    <span>hello@shipcrowd.com</span>
                                </a>
                                <div
                                    className="flex items-center gap-3 text-sm"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    <Phone size={16} />
                                    <span>+91 (800) 123-4567</span>
                                </div>
                                <div
                                    className="flex items-start gap-3 text-sm"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                                    <span>Mumbai, Maharashtra, India</span>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div className="flex gap-3">
                                {[
                                    { Icon: Twitter, href: "#", label: "Twitter" },
                                    { Icon: Linkedin, href: "#", label: "LinkedIn" },
                                    { Icon: Github, href: "#", label: "GitHub" },
                                    { Icon: Instagram, href: "#", label: "Instagram" },
                                ].map(({ Icon, href, label }) => (
                                    <a
                                        key={label}
                                        href={href}
                                        aria-label={label}
                                        className="flex items-center justify-center w-10 h-10 rounded-lg transition-all"
                                        style={{
                                            backgroundColor: 'var(--bg-tertiary)',
                                            color: 'var(--text-tertiary)',
                                            border: '1px solid var(--border-default)',
                                            transition: 'all 200ms var(--ease-out)',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-focus)'
                                            e.currentTarget.style.color = 'var(--text-brand)'
                                            e.currentTarget.style.backgroundColor = 'var(--bg-selected)'
                                            e.currentTarget.style.transform = 'translateY(-2px)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-default)'
                                            e.currentTarget.style.color = 'var(--text-tertiary)'
                                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                                            e.currentTarget.style.transform = 'translateY(0)'
                                        }}
                                    >
                                        <Icon size={18} />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Links Columns - Each spans 2 columns */}
                        <div className="lg:col-span-2">
                            <h4
                                className="font-semibold text-sm mb-6"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Product
                            </h4>
                            <ul className="space-y-3.5">
                                {["Features", "Pricing", "Integrations", "API Docs", "Changelog", "Roadmap"].map((item) => (
                                    <li key={item}>
                                        <Link
                                            href="#"
                                            className="text-sm inline-block"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                transition: 'color 200ms var(--ease-out)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-brand)'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                        >
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="lg:col-span-2">
                            <h4
                                className="font-semibold text-sm mb-6"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Company
                            </h4>
                            <ul className="space-y-3.5">
                                {["About Us", "Blog", "Careers", "Press Kit", "Contact", "Partners"].map((item) => (
                                    <li key={item}>
                                        <Link
                                            href="#"
                                            className="text-sm inline-block"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                transition: 'color 200ms var(--ease-out)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-brand)'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                        >
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="lg:col-span-2">
                            <h4
                                className="font-semibold text-sm mb-6"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Resources
                            </h4>
                            <ul className="space-y-3.5">
                                {["Help Center", "Documentation", "Guides", "Status", "Track Order", "Community"].map((item) => (
                                    <li key={item}>
                                        <Link
                                            href="#"
                                            className="text-sm inline-block"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                transition: 'color 200ms var(--ease-out)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-brand)'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                        >
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="lg:col-span-2">
                            <h4
                                className="font-semibold text-sm mb-6"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Legal
                            </h4>
                            <ul className="space-y-3.5">
                                {["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR", "Security", "Compliance"].map((item) => (
                                    <li key={item}>
                                        <Link
                                            href="#"
                                            className="text-sm inline-block"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                transition: 'color 200ms var(--ease-out)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-brand)'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                        >
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div
                    className="py-6 flex flex-col sm:flex-row justify-between items-center gap-4"
                    style={{ borderTop: '1px solid var(--border-default)' }}
                >
                    <p
                        className="text-sm"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        © {currentYear} ShipCrowd. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link
                            href="#"
                            className="text-sm"
                            style={{
                                color: 'var(--text-tertiary)',
                                transition: 'color 200ms var(--ease-out)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >
                            Sitemap
                        </Link>
                        <Link
                            href="#"
                            className="text-sm"
                            style={{
                                color: 'var(--text-tertiary)',
                                transition: 'color 200ms var(--ease-out)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >
                            Accessibility
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
