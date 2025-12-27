/**
 * Example KYC Verification Page with Enhanced UX
 * This demonstrates how to use all the new components together
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileText, Building2, CreditCard, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import { Alert, AlertDescription } from "@/components/ui/feedback/Alert"
import { LoadingButton } from "@/components/ui/utility/LoadingButton"
import {
    PANCardPreview,
    AadhaarCardPreview,
    GSTINPreview,
    BankAccountPreview,
    StatusBadge
} from "@/components/kyc/DocumentPreview"

export default function KYCVerificationPage() {
    // PAN State
    const [panNumber, setPanNumber] = useState("")
    const [panName, setPanName] = useState("")
    const [isPanVerifying, setIsPanVerifying] = useState(false)
    const [panError, setPanError] = useState<string | null>(null)
    const [panStatus, setPanStatus] = useState<'verified' | 'pending' | 'rejected' | 'not_submitted'>('not_submitted')
    const [panData, setPanData] = useState<any>(null)

    // Aadhaar State
    const [aadhaarNumber, setAadhaarNumber] = useState("")
    const [isAadhaarVerifying, setIsAadhaarVerifying] = useState(false)
    const [aadhaarError, setAadhaarError] = useState<string | null>(null)
    const [aadhaarStatus, setAadhaarStatus] = useState<'verified' | 'pending' | 'rejected' | 'not_submitted'>('not_submitted')
    const [aadhaarData, setAadhaarData] = useState<any>(null)

    // Handle PAN Verification
    const handleVerifyPAN = async () => {
        setPanError(null)

        // Client-side validation
        if (!panNumber || !panName) {
            const message = "Please enter PAN number and name"
            setPanError(message)
            toast.error(message)
            return
        }

        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/
        if (!panRegex.test(panNumber.toUpperCase())) {
            const message = "Invalid PAN format. Please enter a valid 10-character PAN (e.g., ABCDE1234F)"
            setPanError(message)
            toast.error(message)
            return
        }

        setIsPanVerifying(true)

        try {
            // Replace with actual API call
            // const result = await verifyPAN(panNumber, panName)

            // Simulated API call
            await new Promise(resolve => setTimeout(resolve, 2000))

            setPanStatus('verified')
            setPanData({ panNumber, name: panName, verifiedOn: new Date().toISOString() })
            toast.success("PAN verified successfully!")
        } catch (err: any) {
            const errorMessage = getErrorMessage(err)
            setPanError(errorMessage)
            toast.error(errorMessage)
            setPanStatus('rejected')
        } finally {
            setIsPanVerifying(false)
        }
    }

    // Handle Aadhaar Verification
    const handleVerifyAadhaar = async () => {
        setAadhaarError(null)

        // Client-side validation
        if (!aadhaarNumber) {
            const message = "Please enter Aadhaar number"
            setAadhaarError(message)
            toast.error(message)
            return
        }

        const aadhaarRegex = /^[0-9]{12}$/
        if (!aadhaarRegex.test(aadhaarNumber)) {
            const message = "Invalid Aadhaar format. Please enter a valid 12-digit Aadhaar number"
            setAadhaarError(message)
            toast.error(message)
            return
        }

        setIsAadhaarVerifying(true)

        try {
            // Replace with actual API call
            // Step 1: Send OTP
            // const result = await sendAadhaarOTP(aadhaarNumber)

            // Simulated API call
            await new Promise(resolve => setTimeout(resolve, 2000))

            setAadhaarStatus('verified')
            setAadhaarData({ aadhaarNumber, name: "User Name", verifiedOn: new Date().toISOString() })
            toast.success("Aadhaar verified successfully!")
        } catch (err: any) {
            const errorMessage = getErrorMessage(err)
            setAadhaarError(errorMessage)
            toast.error(errorMessage)
            setAadhaarStatus('rejected')
        } finally {
            setIsAadhaarVerifying(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        KYC Verification
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Complete your KYC to start shipping with ShipCrowd
                    </p>
                </div>

                {/* Progress Overview */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                        <FileText className="w-5 h-5 text-primaryBlue mb-2" />
                        <StatusBadge status={panStatus} className="mb-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">PAN Card</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                        <FileText className="w-5 h-5 text-primaryBlue mb-2" />
                        <StatusBadge status={aadhaarStatus} className="mb-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Aadhaar</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                        <Building2 className="w-5 h-5 text-primaryBlue mb-2" />
                        <StatusBadge status="not_submitted" className="mb-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">GSTIN</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                        <CreditCard className="w-5 h-5 text-primaryBlue mb-2" />
                        <StatusBadge status="not_submitted" className="mb-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Bank Account</p>
                    </div>
                </div>

                {/* PAN Verification */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        1. PAN Card Verification
                    </h2>

                    {panData ? (
                        <PANCardPreview
                            panNumber={panData.panNumber}
                            name={panData.name}
                            status={panStatus}
                            verifiedOn={panData.verifiedOn}
                        />
                    ) : (
                        <div className="p-6 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                            {panError && (
                                <Alert variant="error" dismissible onDismiss={() => setPanError(null)} className="mb-4">
                                    <AlertDescription>{panError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        PAN Number
                                    </label>
                                    <input
                                        type="text"
                                        value={panNumber}
                                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none transition-all"
                                        disabled={isPanVerifying}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Name (as per PAN)
                                    </label>
                                    <input
                                        type="text"
                                        value={panName}
                                        onChange={(e) => setPanName(e.target.value)}
                                        placeholder="Enter name as on PAN card"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none transition-all"
                                        disabled={isPanVerifying}
                                    />
                                </div>

                                <LoadingButton
                                    onClick={handleVerifyPAN}
                                    isLoading={isPanVerifying}
                                    loadingText="Verifying PAN..."
                                    className="bg-primaryBlue hover:bg-primaryBlue/90"
                                >
                                    <span className="flex items-center gap-2">
                                        Verify PAN
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                </LoadingButton>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Aadhaar Verification */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        2. Aadhaar Verification
                    </h2>

                    {aadhaarData ? (
                        <AadhaarCardPreview
                            aadhaarNumber={aadhaarData.aadhaarNumber}
                            name={aadhaarData.name}
                            status={aadhaarStatus}
                            verifiedOn={aadhaarData.verifiedOn}
                        />
                    ) : (
                        <div className="p-6 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                            {aadhaarError && (
                                <Alert variant="error" dismissible onDismiss={() => setAadhaarError(null)} className="mb-4">
                                    <AlertDescription>{aadhaarError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Aadhaar Number
                                    </label>
                                    <input
                                        type="text"
                                        value={aadhaarNumber}
                                        onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456789012"
                                        maxLength={12}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none transition-all"
                                        disabled={isAadhaarVerifying}
                                    />
                                </div>

                                <LoadingButton
                                    onClick={handleVerifyAadhaar}
                                    isLoading={isAadhaarVerifying}
                                    loadingText="Verifying Aadhaar..."
                                    className="bg-primaryBlue hover:bg-primaryBlue/90"
                                >
                                    <span className="flex items-center gap-2">
                                        Verify Aadhaar
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                </LoadingButton>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
