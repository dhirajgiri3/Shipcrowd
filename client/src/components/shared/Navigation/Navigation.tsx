"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, ChevronRight } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { cn } from "@/src/lib/utils"

export default function Navigation() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const navLinks = [
        { name: "Features", href: "#features" },
        { name: "How It Works", href: "#how-it-works" },
        { name: "Pricing", href: "#pricing" },
        { name: "Track Order", href: "#track" },
        { name: "Admin Dashboard", href: "/admin" },
    ]

    return (
        <>
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300",
                    isScrolled
                        ? "bg-white/80 backdrop-blur-md border-b border-charcoal-200 shadow-sm"
                        : "bg-transparent border-b border-transparent"
                )}
            >
                <div className="container mx-auto h-full px-6 md:px-12 flex items-center justify-between max-w-[1400px]">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <img
                            src="/logos/Shipcrowd-logo.png"
                            alt="ShipCrowd"
                            className="h-[30px] w-auto object-contain group-hover:scale-105 transition-transform duration-200"
                        />
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-[15px] font-medium text-charcoal-800 hover:text-primaryBlue transition-colors relative group"
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primaryBlue transition-all duration-200 group-hover:w-full" />
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                variant="ghost"
                                className="font-medium text-[15px] h-10 px-6 border border-slate-200 hover:border-primaryBlue/30 hover:bg-primaryBlue/5 text-slate-700 hover:text-primaryBlue transition-all duration-300"
                            >
                              <Link href="/login">Login</Link>
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                            <Button className="font-semibold text-[15px] h-10 px-6 shadow-[0_4px_14px_-4px_rgba(37,37,255,0.4)] hover:shadow-[0_6px_20px_-4px_rgba(37,37,255,0.6)] transition-all duration-300">
                              <Link href="/signup">Sign Up</Link>
                            </Button>
                        </motion.div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-charcoal-900"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 z-50 backdrop-blur-sm md:hidden"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-[300px] bg-white z-50 shadow-2xl p-6 flex flex-col md:hidden"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <span className="font-bold text-xl text-charcoal-950">Menu</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 hover:bg-charcoal-100 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-charcoal-600" />
                                </button>
                            </div>

                            <div className="flex flex-col gap-6">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="text-lg font-medium text-charcoal-800 hover:text-primaryBlue flex items-center justify-between group"
                                    >
                                        {link.name}
                                        <ChevronRight className="w-5 h-5 text-charcoal-400 group-hover:text-primaryBlue transition-colors" />
                                    </Link>
                                ))}
                            </div>

                            <div className="mt-auto flex flex-col gap-4">
                                <Button variant="outline" className="w-full justify-center text-base py-6">
                                  <Link href="/login">Log in</Link>
                                </Button>
                                <Button className="w-full justify-center text-base py-6 shadow-blue">
                                  <Link href="/signup">Sign Up Free</Link>
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
