"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, ChevronRight, User, LogOut, Package, LayoutDashboard, Settings } from "lucide-react"
import { Button } from "@/src/shared/components/button"
import { cn } from "@/src/shared/utils/cn"
import { useAuth } from "@/src/features/auth"

export default function Navigation() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const { user, isAuthenticated, logout, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('.user-menu-container')) {
                setIsUserMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const publicNavLinks = [
        { name: "Features", href: "/#features" },
        { name: "How It Works", href: "/#how-it-works" },
        { name: "Pricing", href: "/#pricing" },
        { name: "Track Order", href: "/track" },
    ]

    const authenticatedNavLinks = [
        { name: "Dashboard", href: user?.role === 'admin' ? '/admin' : '/seller', icon: LayoutDashboard },
        { name: "Shipments", href: '/seller/shipments', icon: Package },
        { name: "Settings", href: '/seller/settings', icon: Settings },
    ]

    const handleLogout = async () => {
        await logout()
        setIsUserMenuOpen(false)
        setIsMobileMenuOpen(false)
        router.push('/login')
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const getUserDisplayName = () => {
        if (!user) return ''
        return user.name || user.email?.split('@')[0] || 'User'
    }

    return (
        <>
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300",
                    isScrolled
                        ? "bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm"
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
                        {isAuthenticated ? (
                            authenticatedNavLinks.map((link) => {
                                const Icon = link.icon
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className="text-[15px] font-medium text-slate-700 hover:text-primaryBlue transition-colors relative group flex items-center gap-2"
                                    >
                                        <Icon className="w-4 h-4" />
                                        {link.name}
                                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primaryBlue transition-all duration-200 group-hover:w-full" />
                                    </Link>
                                )
                            })
                        ) : (
                            publicNavLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="text-[15px] font-medium text-slate-700 hover:text-primaryBlue transition-colors relative group"
                                >
                                    {link.name}
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primaryBlue transition-all duration-200 group-hover:w-full" />
                                </Link>
                            ))
                        )}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        {isLoading ? (
                            <div className="h-10 w-24 bg-slate-100 rounded-lg animate-pulse" />
                        ) : isAuthenticated ? (
                            <div className="relative user-menu-container">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primaryBlue to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                                        {getInitials(getUserDisplayName())}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">
                                        {getUserDisplayName()}
                                    </span>
                                </button>

                                <AnimatePresence>
                                    {isUserMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 overflow-hidden"
                                        >
                                            <div className="px-4 py-3 border-b border-slate-100">
                                                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                                                <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md capitalize">
                                                    {user?.role}
                                                </span>
                                            </div>
                                            <Link
                                                href={user?.role === 'admin' ? '/admin' : '/seller'}
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm text-slate-700"
                                            >
                                                <LayoutDashboard className="w-4 h-4" />
                                                Dashboard
                                            </Link>
                                            <Link
                                                href="/seller/settings/profile"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm text-slate-700"
                                            >
                                                <User className="w-4 h-4" />
                                                Profile Settings
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-sm text-red-600 border-t border-slate-100 mt-1"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Logout
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <>
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Link href="/login">
                                        <Button
                                            variant="ghost"
                                            className="font-medium text-[15px] h-10 px-6 border border-slate-200 hover:border-primaryBlue/30 hover:bg-primaryBlue/5 text-slate-700 hover:text-primaryBlue transition-all duration-300"
                                        >
                                            Login
                                        </Button>
                                    </Link>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                                    <Link href="/signup">
                                        <Button className="font-semibold text-[15px] h-10 px-6 shadow-[0_4px_14px_-4px_rgba(37,37,255,0.4)] hover:shadow-[0_6px_20px_-4px_rgba(37,37,255,0.6)] transition-all duration-300">
                                            Sign Up
                                        </Button>
                                    </Link>
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-slate-900"
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
                            className="fixed top-0 right-0 bottom-0 w-[300px] bg-white z-50 shadow-2xl p-6 flex flex-col md:hidden overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <span className="font-bold text-xl text-slate-950">Menu</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-slate-600" />
                                </button>
                            </div>

                            {isAuthenticated && user && (
                                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primaryBlue to-blue-600 flex items-center justify-center text-white font-semibold">
                                            {getInitials(getUserDisplayName())}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{user.name}</p>
                                            <p className="text-xs text-slate-600">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md capitalize">
                                        {user.role}
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                {isAuthenticated ? (
                                    authenticatedNavLinks.map((link) => {
                                        const Icon = link.icon
                                        return (
                                            <Link
                                                key={link.name}
                                                href={link.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span className="text-base font-medium flex-1">{link.name}</span>
                                                <ChevronRight className="w-5 h-5 text-slate-400" />
                                            </Link>
                                        )
                                    })
                                ) : (
                                    publicNavLinks.map((link) => (
                                        <Link
                                            key={link.name}
                                            href={link.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                                        >
                                            <span className="text-base font-medium">{link.name}</span>
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </Link>
                                    ))
                                )}
                            </div>

                            <div className="mt-auto pt-6 border-t border-slate-200">
                                {isAuthenticated ? (
                                    <Button
                                        onClick={handleLogout}
                                        variant="outline"
                                        className="w-full justify-center text-base py-6 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                    >
                                        <LogOut className="w-5 h-5 mr-2" />
                                        Logout
                                    </Button>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button variant="outline" className="w-full justify-center text-base py-6">
                                                Log in
                                            </Button>
                                        </Link>
                                        <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button className="w-full justify-center text-base py-6 shadow-blue">
                                                Sign Up Free
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
