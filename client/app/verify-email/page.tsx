"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle, Clock, Mail } from "lucide-react"
import { authApi } from "@/src/core/api/authApi"
import { toast } from "sonner"
import { Loader } from "@/components/ui"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")

    const [status, setStatus] = useState<"loading" | "success" | "error" | "already_verified" | "expired">("loading")
    const [message, setMessage] = useState("")
    const [countdown, setCountdown] = useState(5)
    const [isResending, setIsResending] = useState(false)
    const [canResend, setCanResend] = useState(true)

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setMessage("Invalid or missing verification token")
            return
        }

        const verify = async () => {
            try {
                const response = await authApi.verifyEmail(token)
                setStatus("success")
                setMessage(response.message || "Email verified successfully!")

                // Auto-redirect to onboarding after 5 seconds
                const timer = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(timer)
                            router.push('/onboarding')
                            return 0
                        }
                        return prev - 1
                    })
                }, 1000)

                return () => clearInterval(timer)
            } catch (err: any) {
                const errorMessage = err.message || "Verification failed"

                // Check if already verified
                if (errorMessage.toLowerCase().includes('already verified')) {
                    setStatus("already_verified")
                    setMessage("This email has already been verified. You can proceed to login.")
                }
                // Check if token expired
                else if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')) {
                    setStatus("expired")
                    setMessage("Your verification link has expired. Please request a new one.")
                }
                // Generic error
                else {
                    setStatus("error")
                    setMessage(errorMessage)
                }
            }
        }

        verify()
    }, [token, router])

    const handleResendVerification = async () => {
        if (!canResend || isResending) return

        setIsResending(true)
        try {
            // Note: This requires the email to be passed or stored
            // For now, we'll redirect to login where they can resend
            toast.info("Please login to resend verification email")
            router.push('/login')
        } catch (err: any) {
            toast.error(err.message || "Failed to resend verification email")
        } finally {
            setIsResending(false)
            setCanResend(false)

            // Re-enable resend after 60 seconds
            setTimeout(() => setCanResend(true), 60000)
        }
    }

    return (
        <motion.div
            className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Link href="/" className="inline-block mb-8">
                <img src="/logos/Shipcrowd-logo.png" alt="ShipCrowd" className="h-8 w-auto mx-auto" />
            </Link>

            {status === "loading" && (
                <div className="space-y-4">
                    <Loader variant="spinner" size="lg" />
                    <h1 className="text-xl font-bold text-gray-900">Verifying your email...</h1>
                    <p className="text-gray-600">Please wait while we verify your email address.</p>
                </div>
            )}

            {status === "success" && (
                <div className="space-y-4">
                    <motion.div
                        className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                    >
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </motion.div>
                    <h1 className="text-xl font-bold text-gray-900">Email Verified!</h1>
                    <p className="text-gray-600">{message}</p>
                    <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" />
                        Redirecting to onboarding in {countdown} seconds...
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push('/onboarding')}
                            className="flex-1 py-3 bg-primaryBlue text-white rounded-lg hover:bg-primaryBlue/90 transition-colors font-medium"
                        >
                            Continue Now
                        </button>
                        <Link
                            href="/login"
                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-center"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            )}

            {status === "already_verified" && (
                <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Already Verified</h1>
                    <p className="text-gray-600">{message}</p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center w-full py-3 mt-4 bg-primaryBlue text-white rounded-lg hover:bg-primaryBlue/90 transition-colors font-medium"
                    >
                        Continue to Login
                    </Link>
                </div>
            )}

            {status === "expired" && (
                <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                        <Clock className="w-8 h-8 text-orange-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Link Expired</h1>
                    <p className="text-gray-600">{message}</p>
                    <div className="space-y-2 mt-4">
                        <button
                            onClick={handleResendVerification}
                            disabled={!canResend || isResending}
                            className="inline-flex items-center justify-center w-full py-3 bg-primaryBlue text-white rounded-lg hover:bg-primaryBlue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResending ? (
                                <>
                                    Resending...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Resend Verification Email
                                </>
                            )}
                        </button>
                        {!canResend && (
                            <p className="text-xs text-gray-500">
                                Please wait 60 seconds before requesting another email
                            </p>
                        )}
                    </div>
                </div>
            )}

            {status === "error" && (
                <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Verification Failed</h1>
                    <p className="text-gray-600">{message}</p>
                    <div className="space-y-2 mt-4">
                        <button
                            onClick={handleResendVerification}
                            disabled={!canResend || isResending}
                            className="inline-flex items-center justify-center w-full py-3 bg-primaryBlue text-white rounded-lg hover:bg-primaryBlue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResending ? (
                                <>
                                    Resending...
                                </>

                            ) : (
                                <>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Resend Verification Email
                                </>
                            )}
                        </button>
                        <Link
                            href="/login"
                            className="inline-block w-full py-3 text-center text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            )}
        </motion.div>
    )
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Suspense fallback={
                <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
                    <Loader variant="spinner" size="lg" />
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            }>
                <VerifyEmailContent />
            </Suspense>
        </div>
    )
}
