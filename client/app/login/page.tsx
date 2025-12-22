"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Mail, Lock, Eye, EyeOff, Github, Chrome, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/src/features/auth"

export default function LoginPage() {
    const router = useRouter()
    const { login, isLoading, error, clearError } = useAuth()

    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [rememberMe, setRememberMe] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        clearError()
        setLocalError(null)

        // Basic validation
        if (!email || !password) {
            setLocalError("Please fill in all fields")
            return
        }

        const result = await login({ email, password, rememberMe })

        if (result.success) {
            // Redirect to dashboard based on role
            router.push("/seller")
        } else {
            setLocalError(result.error || "Login failed")
        }
    }

    const displayError = localError || error

    const handleGoogleLogin = () => {
        // Redirect to backend Google OAuth
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/v1/auth/google`
    }

    return (
        <div className="flex min-h-screen bg-[var(--bg-primary)]">
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

                <div className="flex-1 flex flex-col justify-center max-w-[440px] mx-auto w-full">
                    <div className="mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-charcoal-950 mb-3 tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-charcoal-500 text-base md:text-lg">
                            Enter your details to access your dashboard.
                        </p>
                    </div>

                    {/* Error Alert */}
                    {displayError && (
                        <div className="mb-6 p-4 bg-rose/10 border border-rose/20 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-rose">{displayError}</div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
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
                                        placeholder="you@example.com"
                                        disabled={isLoading}
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
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 border border-charcoal-200 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-primaryBlue/20 focus:border-primaryBlue transition-all"
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-charcoal-400 hover:text-charcoal-600 transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-primaryBlue focus:ring-primaryBlue border-gray-300 rounded cursor-pointer"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-charcoal-600 cursor-pointer">
                                    Remember me
                                </label>
                            </div>
                            <div className="text-sm">
                                <Link href="/forgot-password" className="font-medium text-primaryBlue hover:text-indigo-600 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primaryBlue hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primaryBlue transition-all shadow-blue hover:shadow-blue-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-charcoal-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[var(--bg-primary)] text-charcoal-500">Or continue with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="flex items-center justify-center gap-2 py-2.5 border border-charcoal-200 rounded-xl hover:bg-charcoal-50 hover:border-charcoal-300 transition-all text-charcoal-700 font-medium text-sm cursor-pointer"
                            >
                                <Chrome size={18} />
                                <span>Google</span>
                            </button>
                            <button
                                type="button"
                                className="flex items-center justify-center gap-2 py-2.5 border border-charcoal-200 rounded-xl hover:bg-charcoal-50 hover:border-charcoal-300 transition-all text-charcoal-700 font-medium text-sm cursor-pointer"
                            >
                                <Github size={18} />
                                <span>GitHub</span>
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-8 text-center sm:text-left">
                    <p className="text-sm text-charcoal-600">
                        Don't have an account?{" "}
                        <Link href="/signup" className="font-semibold text-primaryBlue hover:text-indigo-600 transition-colors">
                            Sign up for free
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
                        className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-charcoal-900/20 to-transparent mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/100 via-transparent to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-16 z-10 text-white">
                    <div className="max-w-xl">
                        <blockquote className="text-2xl font-medium leading-relaxed mb-6">
                            "Shipcrowd has completely transformed how we handle our global logistics. The AI-driven insights are a game changer."
                        </blockquote>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primaryBlue to-indigo-500 flex items-center justify-center font-bold">
                                JD
                            </div>
                            <div>
                                <div className="font-semibold">John Doe</div>
                                <div className="text-charcoal-300 text-sm">Logistics Manager at TechFlow</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
