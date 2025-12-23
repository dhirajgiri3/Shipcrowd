"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { authApi } from "@/src/core/api/authApi"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("")

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
            } catch (err: any) {
                setStatus("error")
                setMessage(err.message || "Verification failed. Token may be expired.")
            }
        }

        verify()
    }, [token])

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
                    <Loader2 className="w-12 h-12 mx-auto text-primaryBlue animate-spin" />
                    <h1 className="text-xl font-bold text-gray-900">Verifying your email...</h1>
                    <p className="text-gray-600">Please wait while we verify your email address.</p>
                </div>
            )}

            {status === "success" && (
                <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Email Verified!</h1>
                    <p className="text-gray-600">{message}</p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center w-full py-3 mt-4 bg-primaryBlue text-white rounded-lg hover:bg-primaryBlue/90 transition-colors font-medium"
                    >
                        Continue to Login
                    </Link>
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
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center w-full py-3 bg-primaryBlue text-white rounded-lg hover:bg-primaryBlue/90 transition-colors font-medium"
                        >
                            Go to Login
                        </Link>
                        <p className="text-sm text-gray-500">
                            Need a new verification link?{" "}
                            <Link href="/login" className="text-primaryBlue hover:underline">
                                Request here
                            </Link>
                        </p>
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
                    <Loader2 className="w-12 h-12 mx-auto text-primaryBlue animate-spin" />
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            }>
                <VerifyEmailContent />
            </Suspense>
        </div>
    )
}
