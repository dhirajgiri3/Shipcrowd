/**
 * Reset Password Page
 *
 * Features:
 * - Confirm new password with token validation
 * - Password strength indicator
 * - Password match validation
 * - Proper error handling with new auth system
 */

'use client';

import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { PasswordStrengthIndicator } from '@/src/components/ui/form/PasswordStrengthIndicator';
import { useResetPassword } from '@/src/core/api/hooks/auth/useResetPassword';

function ResetPasswordForm() {
    const {
        token,
        password,
        setPassword,
        confirmPassword,
        setConfirmPassword,
        isLoading,
        showPassword,
        setShowPassword,
        showConfirmPassword,
        setShowConfirmPassword,
        handleSubmit
    } = useResetPassword();

    // Show error if token is missing
    const isTokenMissing = !token;

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
                            Reset your password
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Create a new strong password for your account
                        </p>
                    </div>

                    {isTokenMissing ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <Alert variant="error">
                                <AlertDescription>
                                    Invalid or missing reset token. Please request a new password reset link.
                                </AlertDescription>
                            </Alert>

                            <Link
                                href="/forgot-password"
                                className="inline-flex items-center justify-center w-full py-3 px-4 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/90 text-white font-medium rounded-[var(--radius-lg)] transition-all gap-2"
                            >
                                Request new link
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Password Field */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    New Password
                                </label>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a strong password"
                                    disabled={isLoading}
                                    icon={<Lock className="w-5 h-5" />}
                                    rightIcon={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    }
                                />

                                {/* Password Strength */}
                                <PasswordStrengthIndicator password={password} />
                            </div>

                            {/* Confirm Password Field */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Confirm New Password
                                </label>
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    disabled={isLoading}
                                    icon={<Lock className="w-5 h-5" />}
                                    rightIcon={
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    }
                                />

                                {/* Match indicator */}
                                {confirmPassword.length > 0 && (
                                    <motion.div
                                        className="mt-2 flex items-center gap-2"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <CheckCircle2
                                            className={`w-4 h-4 ${password === confirmPassword
                                                ? 'text-[var(--success)]'
                                                : 'text-[var(--text-disabled)]'
                                                }`}
                                        />
                                        <span className={`text-xs ${password === confirmPassword
                                            ? 'text-[var(--success)]'
                                            : 'text-[var(--text-secondary)]'
                                            }`}>
                                            {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                        </span>
                                    </motion.div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full"
                                isLoading={isLoading}
                                disabled={isLoading || !token}
                            >
                                Reset password
                                <ArrowRight className="w-4 h-4 ml-2 my-auto" />
                            </Button>
                        </form>
                    )}
                </div>
            </motion.div>

            {/* Right Side - Premium Hero */}
            <div className="hidden lg:block lg:w-1/2 relative bg-[var(--black)]">
                <div className="absolute inset-0">
                    <img
                        src="/images/auth-bg.png"
                        alt="Logistics"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />
                    <div className="absolute inset-0 bg-[var(--primary-blue)]/[0.03]" />
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

export function ResetPasswordClient() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
                <Loader variant="spinner" size="lg" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
