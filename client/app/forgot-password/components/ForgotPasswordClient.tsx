/**
 * Forgot Password Page
 *
 * Features:
 * - Request password reset via email
 * - Email validation
 * - Proper error handling with new auth system
 * - Security-aware success message
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { useForgotPassword } from '@/src/core/api/hooks/auth/useForgotPassword';

export function ForgotPasswordClient() {
    const { email, setEmail, isLoading, isSuccess, errorMessage, clearError, handleSubmit } = useForgotPassword();

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
                            Forgot your password?
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            {isSuccess
                                ? "We've sent you a password reset link"
                                : "No worries, we'll send you reset instructions"
                            }
                        </p>
                    </div>

                    {isSuccess ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <Alert variant="success">
                                <AlertDescription>
                                    Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
                                </AlertDescription>
                            </Alert>

                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] hover:brightness-110 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
                            </Link>
                        </motion.div>
                    ) : (
                        <>
                            {/* Error Alert */}
                            {errorMessage && (
                                <Alert variant="error" className="mb-5" dismissible onDismiss={clearError}>
                                    <AlertDescription>{errorMessage}</AlertDescription>
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

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    isLoading={isLoading}
                                    disabled={isLoading}
                                >
                                    Send reset link
                                    <ArrowRight className="w-4 h-4 ml-2 my-auto" />
                                </Button>
                            </form>

                            {/* Back to login */}
                            <div className="mt-6">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] hover:brightness-110 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to login
                                </Link>
                            </div>
                        </>
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
                            Account recovery
                            <br />
                            <span className="text-white/70">made simple</span>
                        </h2>
                        <p className="text-lg text-white/60">
                            Get back to shipping in just a few clicks
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
