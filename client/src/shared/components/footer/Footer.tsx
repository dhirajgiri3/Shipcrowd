"use client"

import Link from "next/link"
import { Facebook, Twitter, Instagram, Linkedin, Github } from "lucide-react"

export default function Footer() {
    return (
        <footer className="bg-charcoal-950 text-white pt-20 pb-10 border-t border-charcoal-800">
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <img
                                src="/logos/Shipcrowd-logo.png"
                                alt="ShipCrowd"
                                className="h-[30px] w-auto object-contain"
                            />
                        </Link>
                        <p className="text-charcoal-400 text-sm leading-relaxed max-w-[300px] mb-8">
                            Intelligent logistics for modern e-commerce. We help you ship faster, cheaper, and smarter with the power of AI.
                        </p>
                        <div className="flex gap-4">
                            {[Facebook, Twitter, Instagram, Linkedin, Github].map((Icon, i) => (
                                <a
                                    key={i}
                                    href="#"
                                    className="w-10 h-10 rounded-full border border-charcoal-700 flex items-center justify-center text-charcoal-400 hover:border-primaryBlue hover:text-primaryBlue hover:bg-primaryBlue/10 transition-all duration-300"
                                >
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h4 className="font-semibold text-sm mb-6">Product</h4>
                        <ul className="space-y-4 text-sm text-charcoal-400">
                            {["Features", "Pricing", "Integrations", "API", "Changelog"].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="hover:text-primaryBlue transition-colors">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-sm mb-6">Company</h4>
                        <ul className="space-y-4 text-sm text-charcoal-400">
                            {["About", "Blog", "Careers", "Press", "Contact"].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="hover:text-primaryBlue transition-colors">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-sm mb-6">Resources</h4>
                        <ul className="space-y-4 text-sm text-charcoal-400">
                            {["Help Center", "Documentation", "Status", "Guides", "Track Order"].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="hover:text-primaryBlue transition-colors">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-charcoal-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-charcoal-500 text-sm">
                        © 2024 ShipCrowd. All rights reserved.
                    </div>
                    <div className="flex gap-8 text-sm text-charcoal-500">
                        <Link href="#" className="hover:text-charcoal-300 transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-charcoal-300 transition-colors">Terms of Service</Link>
                        <Link href="#" className="hover:text-charcoal-300 transition-colors">Sitemap</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
