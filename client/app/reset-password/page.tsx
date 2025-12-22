/**
 * Reset Password Page with Enhanced UX
 */

"use client"

import Link from "next/link"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Alert, AlertDescription } from "@/components/ui/Alert"
import { LoadingButton } from "@/components/ui/LoadingButton"
import { authApi } from "@/src/core/api/authApi"

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

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

    useEffect(() => {
        if (!token) {
            setError("Invalid or missing reset token")
            toast.error("Invalid or missing reset token")
        }
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Client-side validation
        if (!password || !confirmPassword) {
            const message = "Please fill in all fields"
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

        if (password !== confirmPassword) {
            const message = "Passwords do not match"
            setError(message)
            toast.error(message)
            return
        }

        if (!token) {
            const message = "Invalid or missing reset token"
            setError(message)
            toast.error(message)
            return
        }

        setIsLoading(true)

        try {
            await authApi.resetPassword(token, password)
            setSuccess(true)
            toast.success("Password reset successful! Redirecting to login...")

            // Redirect after 2 seconds
            setTimeout(() => {
                router.push("/login")
            }, 2000)
        } catch (err: any) {
            const errorMessage = getErrorMessage(err)
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
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
                            Reset your password
                        </h1>
                        <p className="text-gray-600">
                            {success
                                ? "Your password has been reset successfully"
                                : "Create a new strong password for your account"
                            }
                        </p>
                    </div>

                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <Alert variant="success">
                                <AlertDescription>
                                    Your password has been reset successfully. You can now login with your new password.
                                </AlertDescription>
                            </Alert>

                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center w-full py-3 px-4 bg-primaryBlue hover:bg-primaryBlue/90 text-white font-medium rounded-lg transition-all gap-2"
                            >
                                Go to login
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    ) : (
                        <>
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
                                {/* Password Field */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                                        New Password
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

                                {/* Confirm Password Field */}
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none transition-all"
                                            placeholder="Confirm your password"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    {/* Match indicator */}
                                    {confirmPassword.length > 0 && (
                                        <motion.div
                                            className="mt-2 flex items-center gap-2"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            <CheckCircle2
                                                className={`w-4 h-4 ${password === confirmPassword
                                                    ? 'text-emerald-500'
                                                    : 'text-gray-300'
                                                    }`}
                                            />
                                            <span className={`text-xs ${password === confirmPassword
                                                ? 'text-emerald-600'
                                                : 'text-gray-500'
                                                }`}>
                                                {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                            </span>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <LoadingButton
                                    type="submit"
                                    isLoading={isLoading}
                                    loadingText="Resetting password..."
                                    disabled={!token}
                                    className="w-full py-3 bg-primaryBlue hover:bg-primaryBlue/90"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        Reset password
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                </LoadingButton>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>

            {/* Right Side - Premium Hero */}
            <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
                <div className="absolute inset-0">
                    <img
                        src="/images/auth-bg.png"
                        alt="Logistics"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />
                    <div className="absolute inset-0 bg-primaryBlue/[0.03]" />
                </div>

                <div className="relative h-full flex flex-col justify-center p-16">
                    <motion.div
                        className="space-y-6 max-w-lg"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.7 }}
                    >
                        <h2 className="text-5xl font-bold text-white leading-tight tracking-tight">
                            Secure your
                            <br />
                            shipping
                            <br />
                            <span className="text-white/70">operations</span>
                        </h2>
                        <p className="text-lg text-white/60">
                            Create a strong password to protect your account
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    )
}
