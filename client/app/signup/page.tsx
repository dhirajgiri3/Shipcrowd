"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Mail, Lock, User, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle, Check, X } from "lucide-react"
import { useAuth } from "@/src/lib/auth/AuthContext"
import { authService } from "@/src/lib/api/services/auth.service"

export default function SignupPage() {
    const router = useRouter()
    const { register, isLoading, error, clearError } = useAuth()

    const [showPassword, setShowPassword] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [passwordStrength, setPasswordStrength] = useState<{
        score: number;
        feedback: string[];
        isStrong: boolean;
    } | null>(null)

    const handlePasswordChange = async (value: string) => {
        setPassword(value)
        if (value.length >= 4) {
            try {
                const strength = await authService.checkPasswordStrength(value, email, name)
                setPasswordStrength(strength)
            } catch (err) {
                // Ignore errors for password strength checking
            }
        } else {
            setPasswordStrength(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        clearError()
        setLocalError(null)
        setSuccessMessage(null)

        // Basic validation
        if (!name || !email || !password) {
            setLocalError("Please fill in all fields")
            return
        }

        if (!agreedToTerms) {
            setLocalError("Please agree to the Terms of Service and Privacy Policy")
            return
        }

        if (password.length < 8) {
            setLocalError("Password must be at least 8 characters")
            return
        }

        const result = await register({ name, email, password })

        if (result.success) {
            setSuccessMessage(result.message || "Registration successful! Please check your email to verify your account.")
            // Optionally redirect after a delay
            setTimeout(() => {
                router.push("/login")
            }, 3000)
        } else {
            setLocalError(result.error || "Registration failed")
        }
    }

    const displayError = localError || error

    const getStrengthColor = () => {
        if (!passwordStrength) return 'bg-charcoal-200'
        if (passwordStrength.score <= 1) return 'bg-rose'
        if (passwordStrength.score === 2) return 'bg-amber'
        if (passwordStrength.score === 3) return 'bg-cyan'
        return 'bg-emerald'
    }

    const getStrengthLabel = () => {
        if (!passwordStrength) return ''
        if (passwordStrength.score <= 1) return 'Weak'
        if (passwordStrength.score === 2) return 'Fair'
        if (passwordStrength.score === 3) return 'Good'
        return 'Strong'
    }

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side - Form */}
            <div className="w-full lg:w-[45%] flex flex-col justify-between p-8 md:p-12 lg:p-16 xl:p-24 relative z-10">
                {/* Logo */}
                <div>
                    <Link href="/">
                        <img
                            src="/logos/Shipcrowd-logo.png"
                            alt="ShipCrowd"
                            className="h-8 w-auto object-contain"
                        />
                    </Link>
                </div>

                <div className="flex-1 flex flex-col justify-center max-w-[440px] mx-auto w-full py-10 lg:py-0">
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-charcoal-950 mb-3 tracking-tight">
                            Create an account
                        </h1>
                        <p className="text-charcoal-500 text-base md:text-lg">
                            Join thousands of merchants shipping smarter.
                        </p>
                    </div>

                    {/* Success Alert */}
                    {successMessage && (
                        <div className="mb-6 p-4 bg-emerald/10 border border-emerald/20 rounded-xl flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-emerald">{successMessage}</div>
                        </div>
                    )}

                    {/* Error Alert */}
                    {displayError && (
                        <div className="mb-6 p-4 bg-rose/10 border border-rose/20 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-rose">{displayError}</div>
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1.5" htmlFor="name">
                                Full Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-charcoal-200 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-primaryBlue/20 focus:border-primaryBlue transition-all"
                                    placeholder="John Doe"
                                    disabled={isLoading || !!successMessage}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1.5" htmlFor="email">
                                Email address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-charcoal-200 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-primaryBlue/20 focus:border-primaryBlue transition-all"
                                    placeholder="you@company.com"
                                    disabled={isLoading || !!successMessage}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1.5" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 border border-charcoal-200 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-primaryBlue/20 focus:border-primaryBlue transition-all"
                                    placeholder="Create a strong password"
                                    disabled={isLoading || !!successMessage}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-charcoal-400 hover:text-charcoal-600 transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Password strength indicator */}
                            {password.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-1 flex-1 rounded-full transition-all ${passwordStrength && passwordStrength.score >= level
                                                        ? getStrengthColor()
                                                        : 'bg-charcoal-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-charcoal-500">
                                            Must be at least 8 characters.
                                        </p>
                                        {passwordStrength && (
                                            <span className={`text-xs font-medium ${passwordStrength.score <= 1 ? 'text-rose' :
                                                    passwordStrength.score === 2 ? 'text-amber' :
                                                        passwordStrength.score === 3 ? 'text-cyan' :
                                                            'text-emerald'
                                                }`}>
                                                {getStrengthLabel()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="h-4 w-4 text-primaryBlue focus:ring-primaryBlue border-gray-300 rounded cursor-pointer"
                                    disabled={isLoading || !!successMessage}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="terms" className="text-charcoal-600">
                                    I agree to the <a href="#" className="font-medium text-primaryBlue hover:underline">Terms of Service</a> and <a href="#" className="font-medium text-primaryBlue hover:underline">Privacy Policy</a>
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !!successMessage}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primaryBlue hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primaryBlue transition-all shadow-blue hover:shadow-blue-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : successMessage ? (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Account created!
                                </>
                            ) : (
                                <>
                                    Create account
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center sm:text-left">
                    <p className="text-sm text-charcoal-600">
                        Already have an account?{" "}
                        <Link href="/login" className="font-semibold text-primaryBlue hover:text-indigo-600 transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Image/Branding */}
            <div className="hidden lg:block lg:w-[55%] relative overflow-hidden bg-charcoal-900">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/images/auth-bg.png"
                        alt="Background"
                        className="w-full h-full object-cover scale-x-[-1] opacity-80"
                    />
                    {/* Mirror image for valid variation */}
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-charcoal-900/20 to-transparent mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/100 via-transparent to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-16 z-10 text-white">
                    <div className="max-w-xl space-y-8">
                        <div className="grid gap-6">
                            {[
                                "AI-Powered Rate Optimization",
                                "Real-time Multi-Carrier Tracking",
                                "Automated Label Generation"
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                        <CheckCircle2 className="text-emerald" size={24} />
                                    </div>
                                    <span className="text-lg font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4">
                            <h3 className="text-2xl font-bold mb-2">Start shipping smarter today.</h3>
                            <p className="text-charcoal-300">Join the fastest growing shipping aggregator platform.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
