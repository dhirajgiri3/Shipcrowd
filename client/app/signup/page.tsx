/**
 * Enhanced Signup Page with Toast Notifications and Better Error Handling
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
    User,
    Eye,
    EyeOff,
    CheckCircle2,
} from "lucide-react"
import { useAuth } from "@/src/features/auth"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Alert, AlertDescription } from "@/components/ui/Alert"
import { LoadingButton } from "@/components/ui/LoadingButton"

export default function SignupPage() {
    const router = useRouter()
    const { register, isLoading } = useAuth()

    const [showPassword, setShowPassword] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Password strength calculation
    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { score: 0, label: '', color: '' }

        let score = 0
        if (pwd.length >= 8) score++
        if (pwd.length >= 12) score++
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
        if (/\d/.test(pwd)) score++
        if (/[^a-zA-Z0-9]/.test(pwd)) score++

        if (score <= 2) return { score, label: 'Weak', color: 'red' }
        if (score === 3) return { score, label: 'Fair', color: 'amber' }
        if (score === 4) return { score, label: 'Good', color: 'blue' }
        return { score, label: 'Strong', color: 'emerald' }
    }

    const passwordStrength = password ? getPasswordStrength(password) : null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)

        // Client-side validation
        if (!name || !email || !password) {
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

        if (!agreedToTerms) {
            const message = "Please agree to the Terms of Service and Privacy Policy"
            setError(message)
            toast.error(message)
            return
        }

        if (password.length < 8) {
            const message = "Password must be at least 8 characters"
            setError(message)
            toast.error(message)
            return
        }

        try {
            const result = await register({ name, email, password })

            if (result.success) {
                const message = result.message || "Registration successful! Please check your email to verify your account."
                setSuccessMessage(message)
                toast.success(message)

                // Redirect after 3 seconds
                setTimeout(() => {
                    router.push("/login")
                }, 3000)
            } else {
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
                            Create your account
                        </h1>
                        <p className="text-gray-600">
                            Get started with your free account
                        </p>
                    </div>

                    {/* Success Alert */}
                    {successMessage && (
                        <motion.div
                            className="mb-6"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Alert variant="success" dismissible onDismiss={() => setSuccessMessage(null)}>
                                <AlertDescription>{successMessage}</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

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

                    {/* Google Signup Button */}
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all group"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span className="font-medium text-gray-700 group-hover:text-gray-900">
                                Sign up with Google
                            </span>
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Field */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none transition-all"
                                    placeholder="John Doe"
                                    disabled={isLoading || !!successMessage}
                                />
                            </div>
                        </div>

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
                                    disabled={isLoading || !!successMessage}
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
                                    placeholder="Create a strong password"
                                    disabled={isLoading || !!successMessage}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Password strength indicator */}
                            {password.length > 0 && passwordStrength && (
                                <motion.div
                                    className="mt-3 space-y-2"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-1 flex-1 rounded-full transition-all ${passwordStrength.score >= level
                                                    ? passwordStrength.color === 'red' ? 'bg-red-500' :
                                                        passwordStrength.color === 'amber' ? 'bg-amber-500' :
                                                            passwordStrength.color === 'blue' ? 'bg-primaryBlue' :
                                                                'bg-emerald-500'
                                                    : 'bg-gray-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-gray-500">
                                            Must be at least 8 characters
                                        </p>
                                        <span
                                            className={`text-xs font-semibold ${passwordStrength.color === 'red' ? 'text-red-500' :
                                                passwordStrength.color === 'amber' ? 'text-amber-500' :
                                                    passwordStrength.color === 'blue' ? 'text-primaryBlue' :
                                                        'text-emerald-500'
                                                }`}
                                        >
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primaryBlue focus:ring-primaryBlue focus:ring-offset-0"
                                disabled={isLoading || !!successMessage}
                            />
                            <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                                I agree to the{" "}
                                <a href="/terms" className="text-primaryBlue hover:text-primaryBlue/80 font-medium">
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a href="/privacy" className="text-primaryBlue hover:text-primaryBlue/80 font-medium">
                                    Privacy Policy
                                </a>
                            </label>
                        </div>

                        {/* Submit Button - Using LoadingButton */}
                        <LoadingButton
                            type="submit"
                            isLoading={isLoading}
                            loadingText="Creating account..."
                            disabled={!!successMessage}
                            className="w-full py-3 bg-primaryBlue hover:bg-primaryBlue/90"
                        >
                            <span className="flex items-center justify-center gap-2">
                                Create account
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        </LoadingButton>
                    </form>

                    {/* Footer */}
                    <p className="mt-8 text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link href="/login" className="font-semibold text-primaryBlue hover:text-primaryBlue/80 transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </motion.div>

            {/* Right Side - Premium Hero (unchanged) */}
            <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
                <div className="absolute inset-0">
                    <img
                        src="/images/auth-bg.png"
                        alt="Logistics"
                        className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-transparent to-black/30" />
                    <div className="absolute inset-0 bg-primaryBlue/[0.03]" />
                </div>

                <div className="relative h-full flex flex-col justify-between p-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-sm font-medium text-white/90 tracking-wide">
                                Join thousands of merchants
                            </span>
                        </div>
                    </motion.div>

                    <motion.div
                        className="space-y-6 max-w-lg"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.7 }}
                    >
                        <h2 className="text-5xl font-bold text-white leading-tight tracking-tight">
                            Start shipping
                            <br />
                            smarter in
                            <br />
                            <span className="text-white/70">under 5 minutes</span>
                        </h2>
                    </motion.div>

                    <motion.div
                        className="space-y-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="text-white font-semibold mb-0.5">No setup fees</div>
                                <div className="text-sm text-white/60">Pay only for what you ship</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="text-white font-semibold mb-0.5">Instant integration</div>
                                <div className="text-sm text-white/60">Connect all couriers in minutes</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="text-white font-semibold mb-0.5">24/7 support</div>
                                <div className="text-sm text-white/60">Help when you need it most</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
