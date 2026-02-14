/**
 * Login Page
 *
 * Features:
 * - Email/password authentication
 * - Google OAuth integration
 * - Password visibility toggle
 * - Remember me functionality
 * - Proper error handling with new auth system
 * - Role-based redirect after successful login
 */

'use client';

import Link from 'next/link';
import { Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Mail,
    Lock,
    Eye,
    EyeOff,
} from 'lucide-react';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useLogin } from '@/src/core/api/hooks/auth/useLogin';
import { OAUTH_CONFIG } from '@/src/config/oauth';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { getAuthErrorMessage } from '@/src/lib/error';

export function LoginClient() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
                <Loader variant="spinner" size="lg" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isInitialized, isAuthenticated, error, clearError } = useAuth();

    const {
        email,
        setEmail,
        password,
        setPassword,
        isLoading,
        showPassword,
        togglePasswordVisibility,
        handleSubmit
    } = useLogin();

    const sessionExpired = searchParams.get('session_expired') === 'true' || searchParams.get('auth_error') === 'session_expired';
    const displayError = sessionExpired
        ? 'Your session has expired. Please sign in again to continue.'
        : (error ? getAuthErrorMessage(error) : null);

    const handleDismissError = useCallback(() => {
        clearError();
        if (sessionExpired) {
            router.replace('/login', { scroll: false });
        }
    }, [clearError, sessionExpired, router]);

    // Don't render until auth is initialized
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
                <Loader variant="spinner" size="lg" message="Loading..." />
            </div>
        );
    }

    // Don't show page if redirecting (handled by middleware usually, but good fallback)
    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-[var(--bg-primary)]">
            {/* Left Side - Form */}
            <motion.div
                className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-12 lg:p-20 bg-[var(--bg-primary)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="w-full max-w-md mx-auto">
                    {/* Logo */}
                    <Link href="/" className="inline-block mb-12">
                        <img
                            src="https://res.cloudinary.com/divbobkmd/image/upload/v1769869575/Shipcrowd-logo_utcmu0.png"
                            alt="Shipcrowd"
                            className="h-8 w-auto rounded-full"
                        />
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                            Welcome back
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Sign in to your account to continue
                        </p>
                    </div>

                    {/* Google Login Button */}
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={() => window.location.href = OAUTH_CONFIG.google.authUrl}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-lg)] hover:bg-[var(--bg-hover)] transition-all group"
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
                            <span className="font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                                Continue with Google
                            </span>
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[var(--border-default)]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-[var(--bg-primary)] text-[var(--text-tertiary)]">Or continue with email</span>
                        </div>
                    </div>

                    {/* Error Alert */}
                    {displayError && (
                        <Alert variant="error" className="mb-5" dismissible onDismiss={handleDismissError}>
                            <AlertDescription>{displayError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Email
                            </label>
                            <Input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                disabled={isLoading}
                                icon={<Mail className="w-5 h-5" />}
                            />
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Password
                            </label>
                            <Input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                disabled={isLoading}
                                icon={<Lock className="w-5 h-5" />}
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                }
                            />
                        </div>

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)] focus:ring-offset-0 bg-[var(--bg-elevated)]"
                                />
                                <span className="text-sm text-[var(--text-secondary)]">Remember me for 30 days</span>
                            </label>
                            <Link href="/forgot-password" className="text-sm font-medium text-[var(--primary-blue)] hover:brightness-110 transition-all">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            isLoading={isLoading}
                            disabled={isLoading}
                        >
                            Sign in
                            <ArrowRight className="w-4 h-4 ml-2 my-auto" />
                        </Button>
                    </form>

                    {/* Footer */}
                    <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
                        Don't have an account?{" "}
                        <Link href="/signup" className="font-semibold text-[var(--primary-blue)] hover:brightness-110 transition-all">
                            Sign up
                        </Link>
                    </p>

                    {/* Magic Link Option */}
                    <div className="mt-4 text-center">
                        <Link
                            href="/magic-link"
                            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--primary-blue)] transition-colors"
                        >
                            Or sign in with a magic link →
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* Right Side - Premium Hero */}
            <div className="hidden lg:block lg:w-1/2 relative bg-[var(--black)]">
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
                    <div className="absolute inset-0 bg-[var(--primary-blue)]/[0.03]" />
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
    );
}
