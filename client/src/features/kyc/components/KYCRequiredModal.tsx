"use client"

import { useRouter } from "next/navigation"
import { ShieldCheck, X, AlertCircle } from "lucide-react"
import { Button } from '@/src/components/ui/core/Button"
import { motion, AnimatePresence } from "framer-motion"

interface KYCRequiredModalProps {
    isOpen: boolean
    onClose: () => void
    onComplete: () => void
    title?: string
    description?: string
    allowDismiss?: boolean
    reason?: string
}

export function KYCRequiredModal({
    isOpen,
    onClose,
    onComplete,
    title = "KYC Verification Required",
    description = "To access this feature and ensure secure transactions, please complete your KYC verification.",
    allowDismiss = true,
    reason
}: KYCRequiredModalProps) {
    const router = useRouter()

    const handleComplete = () => {
        onComplete()
        onClose()
    }

    const handleCompleteLater = () => {
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={allowDismiss ? onClose : undefined}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative"
                        >
                            {/* Close button */}
                            {allowDismiss && (
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            )}

                            {/* Icon */}
                            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                <ShieldCheck className="w-8 h-8 text-blue-600" />
                            </div>

                            {/* Content */}
                            <div className="text-center space-y-3 mb-6">
                                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                                <p className="text-gray-600 text-sm">{description}</p>

                                {reason && (
                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2 text-left">
                                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-yellow-800">{reason}</p>
                                    </div>
                                )}

                                {/* Benefits */}
                                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Why KYC is required:</h3>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 mt-0.5">•</span>
                                            <span>Secure payment processing and payouts</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 mt-0.5">•</span>
                                            <span>Compliance with regulatory requirements</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 mt-0.5">•</span>
                                            <span>Protection against fraudulent activities</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 mt-0.5">•</span>
                                            <span>Access to premium features and higher limits</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleComplete}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Complete KYC Now
                                </Button>
                                {allowDismiss && (
                                    <Button
                                        onClick={handleCompleteLater}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Later
                                    </Button>
                                )}
                            </div>

                            <p className="text-xs text-gray-500 text-center mt-4">
                                Takes only 5-10 minutes to complete
                            </p>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
