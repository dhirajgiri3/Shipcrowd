"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Menu,
    X,
    ChevronRight,
    User,
    LogOut,
    Package,
    LayoutDashboard,
    Settings,
    Shield,
    AlertCircle,
    CheckCircle2,
    Clock,
    MapPin
} from "lucide-react"
import { Button } from "@/src/shared/components/button"
import { cn } from "@/src/shared/utils/cn"
import { useAuth, AuthUser } from "@/src/features/auth"

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface NavLink {
    name: string
    href: string
    icon?: React.ComponentType<{ className?: string }>
    showForRoles?: AuthUser['role'][]
    requireKycApproved?: boolean
}

import { siteConfig } from "@/src/config/site.config"

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const PUBLIC_NAV_LINKS: NavLink[] = [
    ...siteConfig.nav.main.map(link => ({
        name: link.name,
        href: link.href.startsWith('#') ? `/${link.href}` : link.href
    })),
    { name: "Track Order", href: "/track" },
]

const getAuthenticatedNavLinks = (user: AuthUser | null): NavLink[] => {
    if (!user) return []

    const baseLinks: NavLink[] = [
        {
            name: "Dashboard",
            href: getDashboardUrl(user),
            icon: LayoutDashboard
        },
    ]

    // Add role-specific links
    if (user.role === 'seller' || user.role === 'staff') {
        baseLinks.push(
            { name: "Shipments", href: '/seller/shipments', icon: Package },
            { name: "Track Orders", href: '/seller/tracking', icon: MapPin },
        )
    }

    if (user.role === 'admin') {
        baseLinks.push(
            { name: "Sellers", href: '/admin/sellers', icon: User },
            { name: "Shipments", href: '/admin/shipments', icon: Package },
        )
    }

    baseLinks.push({ name: "Settings", href: getSettingsUrl(user), icon: Settings })

    return baseLinks
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the appropriate dashboard URL based on user role and status
 */
function getDashboardUrl(user: AuthUser | null): string {
    if (!user) return '/login'

    // Admin users always go to admin dashboard
    if (user.role === 'admin') return '/admin'

    // Sellers/staff need KYC and company setup
    if (user.role === 'seller' || user.role === 'staff') {
        // No company - go to onboarding
        if (!user.companyId) return '/onboarding'

        // KYC not approved - go to KYC page
        const isKycApproved = typeof user.kycStatus === 'string'
            ? user.kycStatus === 'approved'
            : user.kycStatus?.isComplete;

        if (user.kycStatus && !isKycApproved) {
            return '/seller/kyc'
        }

        return '/seller'
    }

    // Default for other roles
    return '/seller'
}

/**
 * Get the appropriate settings URL based on user role
 */
function getSettingsUrl(user: AuthUser | null): string {
    if (!user) return '/login'
    return user.role === 'admin' ? '/admin/settings' : '/seller/settings'
}

/**
 * Get user initials from name
 */
function getInitials(name: string): string {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

/**
 * Get display name from user object
 */
function getDisplayName(user: AuthUser | null): string {
    if (!user) return ''
    return user.name || user.email?.split('@')[0] || 'User'
}

/**
 * Get KYC status display info
 */
function getKycStatusInfo(status?: AuthUser['kycStatus']): {
    label: string
    color: string
    icon: React.ComponentType<{ className?: string }>
    bgColor: string
} {
    // Handle undefined status
    if (!status) {
        return {
            label: 'Complete Setup',
            color: 'text-slate-600',
            icon: Shield,
            bgColor: 'bg-slate-50'
        }
    }

    // Handle specific object status (e.g. from backend)
    if (typeof status === 'object' && status !== null) {
        if (status.isComplete) {
            return {
                label: 'Verified',
                color: 'text-green-700',
                icon: CheckCircle2,
                bgColor: 'bg-green-50'
            }
        }
        return {
            label: 'Complete Setup',
            color: 'text-amber-700',
            icon: AlertCircle,
            bgColor: 'bg-amber-50'
        }
    }

    // Handle string status (legacy/fallback)
    const statusString = status as string;

    switch (statusString) {
        case 'approved':
            return {
                label: 'Verified',
                color: 'text-green-700',
                icon: CheckCircle2,
                bgColor: 'bg-green-50'
            }
        case 'in_progress':
            return {
                label: 'Pending',
                color: 'text-amber-700',
                icon: Clock,
                bgColor: 'bg-amber-50'
            }
        case 'rejected':
            return {
                label: 'Action Required',
                color: 'text-red-700',
                icon: AlertCircle,
                bgColor: 'bg-red-50'
            }
        default:
            return {
                label: 'Complete Setup',
                color: 'text-slate-600',
                icon: Shield,
                bgColor: 'bg-slate-50'
            }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function Navigation() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const { user, isAuthenticated, logout, isLoading } = useAuth()
    const router = useRouter()

    // Memoized navigation links based on user
    const authenticatedNavLinks = useMemo(
        () => getAuthenticatedNavLinks(user),
        [user]
    )

    // Scroll handler
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

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [router])

    const handleLogout = useCallback(async () => {
        await logout()
        setIsUserMenuOpen(false)
        setIsMobileMenuOpen(false)
        router.push('/login')
    }, [logout, router])

    const handleDashboardClick = useCallback(() => {
        if (!user) return
        const dashboardUrl = getDashboardUrl(user)
        router.push(dashboardUrl)
        setIsUserMenuOpen(false)
        setIsMobileMenuOpen(false)
    }, [user, router])

    // Get KYC status info for display
    const kycInfo = useMemo(() => {
        if (!user || user.role === 'admin') return null
        return getKycStatusInfo(user.kycStatus)
    }, [user])

    return (
        <>
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300",
                    isScrolled
                        ? "bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm"
                        : "bg-transparent border-b border-transparent"
                )}
            >
                <div className="container mx-auto h-full px-6 md:px-12 flex items-center justify-between max-w-[1400px]">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <img
                            src="/logos/Shipcrowd-logo.png"
                            alt="ShipCrowd"
                            className="h-[32px] w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-10">
                        {isAuthenticated ? (
                            authenticatedNavLinks.map((link) => {
                                const Icon = link.icon
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className="text-[15px] font-medium text-slate-600 hover:text-primaryBlue transition-colors relative group flex items-center gap-2"
                                    >
                                        {Icon && <Icon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />}
                                        {link.name}
                                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primaryBlue transition-all duration-300 ease-out group-hover:w-full" />
                                    </Link>
                                )
                            })
                        ) : (
                            PUBLIC_NAV_LINKS.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="text-[15px] font-medium text-slate-600 hover:text-primaryBlue transition-colors relative group"
                                >
                                    {link.name}
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primaryBlue transition-all duration-300 ease-out group-hover:w-full" />
                                </Link>
                            ))
                        )}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        {isLoading ? (
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-slate-100 rounded-full animate-pulse" />
                                <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
                            </div>
                        ) : isAuthenticated && user ? (
                            <div className="relative user-menu-container">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className={cn(
                                        "flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full transition-all duration-200 group",
                                        "hover:bg-slate-50 hover:shadow-sm border border-transparent hover:border-slate-200",
                                        isUserMenuOpen && "bg-slate-50 border-slate-200 shadow-sm"
                                    )}
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primaryBlue to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white">
                                        {getInitials(getDisplayName(user))}
                                    </div>
                                    <div className="text-left hidden lg:block">
                                        <span className="text-sm font-semibold text-slate-700 block leading-tight group-hover:text-slate-900 transition-colors">
                                            {getDisplayName(user)}
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-500 capitalize tracking-wide">
                                            {user.role}
                                        </span>
                                    </div>
                                    <ChevronRight className={cn(
                                        "w-4 h-4 text-slate-400 transition-transform duration-200",
                                        isUserMenuOpen && "rotate-90"
                                    )} />
                                </button>

                                <AnimatePresence>
                                    {isUserMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 py-2 overflow-hidden ring-1 ring-slate-900/5"
                                        >
                                            {/* User Info Header */}
                                            <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/30">
                                                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">{user.email}</p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-100">
                                                        {user.role}
                                                    </span>
                                                    {kycInfo && (
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border",
                                                            kycInfo.bgColor,
                                                            kycInfo.color,
                                                            kycInfo.label === 'Verified' ? 'border-green-200' : 'border-amber-200'
                                                        )}>
                                                            <kycInfo.icon className="w-3 h-3" />
                                                            {kycInfo.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Menu Items */}
                                            <div className="p-2 space-y-0.5">
                                                <button
                                                    onClick={handleDashboardClick}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 text-left group"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                        <LayoutDashboard className="w-4 h-4" />
                                                    </div>
                                                    Dashboard
                                                </button>
                                                <Link
                                                    href={getSettingsUrl(user) + '/profile'}
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 group"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    Profile Settings
                                                </Link>

                                                {/* KYC Link for non-admin users */}
                                                {user.role !== 'admin' && (
                                                    (!user.kycStatus ||
                                                        (typeof user.kycStatus === 'string' && user.kycStatus !== 'approved') ||
                                                        (typeof user.kycStatus === 'object' && !user.kycStatus.isComplete))
                                                ) && (
                                                        <Link
                                                            href="/seller/kyc"
                                                            onClick={() => setIsUserMenuOpen(false)}
                                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 transition-colors text-sm font-medium text-amber-700 group mt-1"
                                                        >
                                                            <div className="p-1.5 rounded-lg bg-amber-100/50 text-amber-600 group-hover:text-amber-700 transition-colors">
                                                                <Shield className="w-4 h-4" />
                                                            </div>
                                                            Complete Verification
                                                        </Link>
                                                    )}
                                            </div>

                                            <div className="p-2 mt-1 border-t border-slate-50">
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium text-red-600 text-left group"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-red-50 text-red-500 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                                                        <LogOut className="w-4 h-4" />
                                                    </div>
                                                    Sign Out
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link href="/login">
                                        <Button
                                            variant="ghost"
                                            className="font-semibold text-[15px] h-10 px-5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 rounded-full transition-all duration-300"
                                        >
                                            Log in
                                        </Button>
                                    </Link>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link href="/signup">
                                        <Button className="font-semibold text-[15px] h-10 px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 hover:shadow-xl hover:shadow-slate-300 transition-all duration-300 border border-slate-800">
                                            Sign Up Free
                                        </Button>
                                    </Link>
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay - Premium Design */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm md:hidden"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-white z-50 shadow-2xl flex flex-col md:hidden"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                                <span className="font-bold text-lg text-slate-900 tracking-tight">Menu</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 -mr-2 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                                    aria-label="Close menu"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50">
                                {isAuthenticated && user ? (
                                    <div className="p-5 space-y-6">
                                        {/* User Profile Card */}
                                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
                                            <div className="relative flex items-center gap-4 mb-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primaryBlue to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-200">
                                                    {getInitials(getDisplayName(user))}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg leading-tight text-slate-900">{user.name}</p>
                                                    <p className="text-slate-500 text-sm truncate max-w-[140px]">{user.email}</p>
                                                </div>
                                            </div>

                                            <div className="relative flex gap-2 flex-wrap">
                                                <div className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                    <User className="w-3 h-3" />
                                                    {user.role}
                                                </div>
                                                {kycInfo && (
                                                    <div className={cn(
                                                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                                                        kycInfo.label === 'Verified' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                                                    )}>
                                                        <kycInfo.icon className="w-3 h-3" />
                                                        {kycInfo.label}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Main Navigation Group */}
                                        <div>
                                            <p className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Navigation</p>
                                            <div className="space-y-2">
                                                {authenticatedNavLinks.map((link) => {
                                                    const Icon = link.icon
                                                    return (
                                                        <Link
                                                            key={link.name}
                                                            href={link.href}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group"
                                                        >
                                                            {Icon && <div className="p-2 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-primaryBlue transition-colors"><Icon className="w-5 h-5" /></div>}
                                                            <span className="text-base font-semibold text-slate-700 group-hover:text-slate-900">{link.name}</span>
                                                            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-400 transition-all" />
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Account Group */}
                                        <div>
                                            <p className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Account</p>
                                            <div className="space-y-2">
                                                <Link
                                                    href={getSettingsUrl(user) + '/profile'}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group"
                                                >
                                                    <div className="p-2 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-primaryBlue transition-colors">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-base font-semibold text-slate-700 group-hover:text-slate-900">My Profile</span>
                                                </Link>

                                                {/* KYC Action */}
                                                {user.role !== 'admin' && (
                                                    (!user.kycStatus ||
                                                        (typeof user.kycStatus === 'string' && user.kycStatus !== 'approved') ||
                                                        (typeof user.kycStatus === 'object' && !user.kycStatus.isComplete))
                                                ) && (
                                                        <Link
                                                            href="/seller/kyc"
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-100 shadow-sm hover:shadow-md transition-all group"
                                                        >
                                                            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                                                                <Shield className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <span className="text-base font-semibold text-amber-900 block leading-none mb-1">Verify Identity</span>
                                                                <span className="text-xs text-amber-700/80 font-medium">Unlock full benefits</span>
                                                            </div>
                                                        </Link>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5 space-y-6">
                                        {/* Public Nav */}
                                        <div>
                                            <div className="space-y-2">
                                                {PUBLIC_NAV_LINKS.map((link) => (
                                                    <Link
                                                        key={link.name}
                                                        href={link.href}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
                                                    >
                                                        <span className="text-base font-semibold text-slate-700">{link.name}</span>
                                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
                                            <h4 className="font-bold text-slate-900 mb-1 text-lg">Ready to grow?</h4>
                                            <p className="text-sm text-slate-500 mb-5 leading-relaxed">Join thousands of sellers scaling with Shipcrowd.</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button variant="outline" className="w-full justify-center h-12 rounded-xl bg-white hover:bg-slate-50 border-slate-200 font-semibold">
                                                        Log in
                                                    </Button>
                                                </Link>
                                                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button className="w-full justify-center h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg font-semibold">
                                                        Sign Up
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer / Logout */}
                            {isAuthenticated && (
                                <div className="p-5 border-t border-slate-100 bg-white shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-colors font-bold text-sm tracking-wide"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Log Out
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

