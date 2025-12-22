/**
 * Enhanced Login Page with Toast Notifications and Better Error Handling
 * 
 * Improvements:
 * 1. Toast notifications for success/error feedback
 * 2. LoadingButton component
 * 3. Better error messages from error handler
 * 4. Visual feedback enhancements
 */

"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    ArrowRight,
    Mail,
    Lock,
    Eye,
    EyeOff,
} from "lucide-react"
import { useAuth } from "@/src/features/auth"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Alert, AlertDescription } from "@/components/ui/Alert"
import { LoadingButton } from "@/components/ui/LoadingButton"

export default function LoginPage() {
    const router = useRouter()
    const { login, isLoading } = useAuth()

    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Client-side validation
        if (!email || !password) {
            const message = "Please fill in all fields"
            setError(message)
            toast.error(message)
            return
        }

        if (!email.includes('@')) {
            const message = "Please enter a valid email address"
            setError(message)
            toast.error(message)
            return
        }

        try {
            const result = await login({ email, password, rememberMe })

            if (result.success) {
                toast.success("Welcome back! Redirecting to your dashboard...")
                setTimeout(() => router.push("/seller"), 500)
            } else {
                // Use error handler to get user-friendly message
                const errorMessage = getErrorMessage(result.error)
                setError(errorMessage)
                toast.error(errorMessage)
            }
        } catch (err: any) {
            const errorMessage = getErrorMessage(err)
            setError(errorMessage)
            toast.error(errorMessage)
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Left Side - Form */}
            <motion.div
                className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-12 lg:p-20 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="w-full max-w-md mx-auto">
                    {/* Logo */}
                    <Link href="/" className="inline-block mb-12">
                        <img
                            src="/logos/Shipcrowd-logo.png"
                            alt="ShipCrowd"
                            className="h-8 w-auto"
                        />
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome back
                        </h1>
                        <p className="text-gray-600">
                            Sign in to your account to continue
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <motion.div
                            className="mb-6"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Alert variant="error" dismissible onDismiss={() => setError(null)}>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none transition-all"
                                    placeholder="you@company.com"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none transition-all"
                                    placeholder="Enter your password"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-primaryBlue focus:ring-primaryBlue focus:ring-offset-0"
                                />
                                <span className="text-sm text-gray-600">Remember me for 30 days</span>
                            </label>
                            <Link href="/forgot-password" className="text-sm font-medium text-primaryBlue hover:text-primaryBlue/80 transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit Button - Using LoadingButton */}
                        <LoadingButton
                            type="submit"
                            isLoading={isLoading}
                            loadingText="Signing in..."
                            className="w-full py-3 bg-primaryBlue hover:bg-primaryBlue/90"
                        >
                            <span className="flex items-center justify-center gap-2">
                                Sign in
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        </LoadingButton>
                    </form>

                    {/* Footer */}
                    <p className="mt-8 text-center text-sm text-gray-600">
                        Don't have an account?{" "}
                        <Link href="/signup" className="font-semibold text-primaryBlue hover:text-primaryBlue/80 transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>
            </motion.div>

            {/* Right Side - Premium Hero (unchanged) */}
            <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img
                        src="/images/auth-bg.png"
                        alt="Logistics"
                        className="w-full h-full object-cover"
                    />

                    {/* Premium Dark Overlay System */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />

                    {/* Subtle Brand Tint */}
                    <div className="absolute inset-0 bg-primaryBlue/[0.03]" />
                </div>

                {/* Premium Content */}
                <div className="relative h-full flex flex-col justify-between p-16">
                    {/* Top Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-sm font-medium text-white/90 tracking-wide">
                                Trusted by 10,000+ businesses
                            </span>
                        </div>
                    </motion.div>

                    {/* Center Hero Text */}
                    <motion.div
                        className="space-y-6 max-w-lg"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.7 }}
                    >
                        <h2 className="text-5xl font-bold text-white leading-tight tracking-tight">
                            Ship smarter
                            <br />
                            with India's leading
                            <br />
                            <span className="text-white/70">logistics platform</span>
                        </h2>
                    </motion.div>

                    {/* Bottom Stats */}
                    <motion.div
                        className="grid grid-cols-3 gap-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                    >
                        <div className="space-y-1">
                            <div className="text-3xl font-bold text-white tracking-tight">1M+</div>
                            <div className="text-sm text-white/60 font-medium">Shipments Delivered</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl font-bold text-white tracking-tight">50+</div>
                            <div className="text-sm text-white/60 font-medium">Courier Partners</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl font-bold text-white tracking-tight">28K+</div>
                            <div className="text-sm text-white/60 font-medium">Pin Codes</div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
