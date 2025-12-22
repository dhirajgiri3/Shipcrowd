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
