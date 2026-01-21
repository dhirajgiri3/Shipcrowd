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
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, ArrowLeft } from 'lucide-react';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { LoadingButton } from '@/src/components/ui/utility/LoadingButton';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

export function ForgotPasswordClient() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (!email) {
            const message = 'Please enter your email address';
            setError(message);
            return;
        }

        if (!email.includes('@')) {
            const message = 'Please enter a valid email address';
            setError(message);
            return;
        }

        setIsLoading(true);

        try {
            const result = await resetPassword(email);
            if (result.success) {
                setSuccess(true);
                showSuccessToast('Password reset link sent! Check your email.');
            } else {
                const errorMessage = result.error?.message || 'Failed to send reset link';
                setError(errorMessage);
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to send reset link';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

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
                            src="https://res.cloudinary.com/divbobkmd/image/upload/v1767468077/Helix_logo_yopeh9.png"
                            alt="Helix"
                            className="h-8 w-auto rounded-full"
                        />
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Forgot your password?
                        </h1>
                        <p className="text-gray-600">
                            {success
                                ? "We've sent you a password reset link"
                                : "No worries, we'll send you reset instructions"
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
                                    Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
                                </AlertDescription>
                            </Alert>

                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm font-medium text-primaryBlue hover:text-primaryBlue/80 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
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

                                {/* Submit Button */}
                                <LoadingButton
                                    type="submit"
                                    isLoading={isLoading}
                                    loadingText="Sending reset link..."
                                    className="w-full py-3 bg-primaryBlue hover:bg-primaryBlue/90"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        Send reset link
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                </LoadingButton>
                            </form>

                            {/* Back to login */}
                            <div className="mt-6">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-primaryBlue hover:text-primaryBlue/80 transition-colors"
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
