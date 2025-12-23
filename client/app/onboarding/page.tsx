"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Building2, MapPin, FileText, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/src/features/auth"
import { companyApi, CreateCompanyData } from "@/src/core/api"
import { LoadingButton } from "@/components/ui/LoadingButton"
import { Alert, AlertDescription } from "@/components/ui/Alert"
import { INDIAN_STATES, isValidGSTIN, isValidPAN, isValidPincode } from "@/src/shared"

export default function OnboardingPage() {
    const router = useRouter()
    const { user, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth()

    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form data
    const [formData, setFormData] = useState<CreateCompanyData>({
        name: "",
        address: {
            line1: "",
            line2: "",
            city: "",
            state: "",
            country: "India",
            postalCode: "",
        },
        billingInfo: {
            gstin: "",
            pan: "",
        },
    })

    // Auth guard - redirect if not authenticated or already has company
    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                router.push("/login")
            } else if (user?.companyId) {
                router.push("/seller")
            }
        }
    }, [authLoading, isAuthenticated, user?.companyId, router])

    const updateField = (field: string, value: string) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.')
            setFormData(prev => ({
                ...prev,
                [parent]: { ...(prev[parent as keyof CreateCompanyData] as object), [child]: value }
            }))
        } else {
            setFormData(prev => ({ ...prev, [field]: value }))
        }
    }

    const validateStep = (stepNum: number): boolean => {
        setError(null)

        if (stepNum === 1) {
            if (!formData.name.trim()) {
                setError("Company name is required")
                return false
            }
            if (formData.name.trim().length < 2) {
                setError("Company name must be at least 2 characters")
                return false
            }
        }

        if (stepNum === 2) {
            const { line1, city, state, postalCode } = formData.address
            if (!line1?.trim() || !city?.trim() || !state || !postalCode) {
                setError("Please fill all required address fields")
                return false
            }
            if (!isValidPincode(postalCode)) {
                setError("Postal code must be exactly 6 digits")
                return false
            }
        }

        if (stepNum === 3) {
            const gstin = formData.billingInfo?.gstin || ""
            const pan = formData.billingInfo?.pan || ""

            if (gstin && !isValidGSTIN(gstin)) {
                setError("Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)")
                return false
            }
            if (pan && !isValidPAN(pan)) {
                setError("Invalid PAN format (e.g., ABCDE1234F)")
                return false
            }
        }

        return true
    }

    const nextStep = () => {
        if (validateStep(step)) setStep(s => s + 1)
    }

    const prevStep = () => setStep(s => s - 1)

    const handleSubmit = async () => {
        if (!validateStep(3)) return

        setIsLoading(true)
        setError(null)

        try {
            await companyApi.createCompany(formData)
            await refreshUser()
            toast.success("Company created successfully!")
            router.push("/seller")
        } catch (err: any) {
            const message = err.message || "Failed to create company"
            setError(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    // Show loading while checking auth
    if (authLoading || !isAuthenticated || user?.companyId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-primaryBlue animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Logo */}
                <Link href="/" className="inline-block mb-8">
                    <img src="/logos/Shipcrowd-logo.png" alt="ShipCrowd" className="h-8" />
                </Link>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${s < step ? "bg-emerald-500 text-white" :
                                s === step ? "bg-primaryBlue text-white" : "bg-gray-200 text-gray-500"
                                }`}>
                                {s < step ? <Check className="w-4 h-4" /> : s}
                            </div>
                            {s < 3 && <div className={`w-12 h-1 mx-2 ${s < step ? "bg-emerald-500" : "bg-gray-200"}`} />}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <motion.div
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {error && (
                        <Alert variant="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Step 1: Company Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-primaryBlue/10 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-primaryBlue" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Company Details</h1>
                                    <p className="text-gray-600">Let's set up your business profile</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">Company Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none"
                                    placeholder="Your Company Name"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Address */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-primaryBlue/10 rounded-lg flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-primaryBlue" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Business Address</h1>
                                    <p className="text-gray-600">Where is your business located?</p>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">Address Line 1 *</label>
                                    <input
                                        type="text"
                                        value={formData.address.line1}
                                        onChange={(e) => updateField("address.line1", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none"
                                        placeholder="Building, Street"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">Address Line 2</label>
                                    <input
                                        type="text"
                                        value={formData.address.line2}
                                        onChange={(e) => updateField("address.line2", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none"
                                        placeholder="Area, Landmark (optional)"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">City *</label>
                                        <input
                                            type="text"
                                            value={formData.address.city}
                                            onChange={(e) => updateField("address.city", e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none"
                                            placeholder="City"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">Postal Code *</label>
                                        <input
                                            type="text"
                                            value={formData.address.postalCode}
                                            onChange={(e) => updateField("address.postalCode", e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none"
                                            placeholder="000000"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">State *</label>
                                    <select
                                        value={formData.address.state}
                                        onChange={(e) => updateField("address.state", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none"
                                    >
                                        <option value="">Select State</option>
                                        {INDIAN_STATES.map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Billing */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-primaryBlue/10 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primaryBlue" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Billing Information</h1>
                                    <p className="text-gray-600">Optional - for invoicing</p>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">GSTIN</label>
                                    <input
                                        type="text"
                                        value={formData.billingInfo?.gstin || ""}
                                        onChange={(e) => updateField("billingInfo.gstin", e.target.value.toUpperCase())}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none"
                                        placeholder="22AAAAA0000A1Z5"
                                        maxLength={15}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">PAN</label>
                                    <input
                                        type="text"
                                        value={formData.billingInfo?.pan || ""}
                                        onChange={(e) => updateField("billingInfo.pan", e.target.value.toUpperCase())}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/10 outline-none"
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                    />
                                </div>
                            </div>

                            <p className="text-sm text-gray-500">
                                You can add or verify these later in your account settings.
                            </p>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                        {step > 1 ? (
                            <button
                                onClick={prevStep}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                        ) : <div />}

                        {step < 3 ? (
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-2 px-6 py-3 bg-primaryBlue text-white rounded-lg hover:bg-primaryBlue/90 font-medium"
                            >
                                Continue <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <LoadingButton
                                onClick={handleSubmit}
                                isLoading={isLoading}
                                loadingText="Creating..."
                                className="px-6 py-3 bg-primaryBlue hover:bg-primaryBlue/90"
                            >
                                <span className="flex items-center gap-2">
                                    Complete Setup <Check className="w-4 h-4" />
                                </span>
                            </LoadingButton>
                        )}
                    </div>
                </motion.div>

                {/* Skip for now */}
                <p className="text-center mt-6 text-sm text-gray-500">
                    <Link href="/seller" className="text-primaryBlue hover:underline">
                        Skip for now
                    </Link>
                    {" "}— you can complete this later
                </p>
            </div>
        </div>
    )
}
