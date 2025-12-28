"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, MapPin, FileText, ArrowRight, ArrowLeft, Check, Mail, CheckCircle2, AlertCircle, Save, PartyPopper } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/src/features/auth"
import { Input } from "@/components/ui/forms/Input";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Loader, LoadingButton } from "@/components/ui";
import { companyApi, CreateCompanyData } from "@/src/core/api"
import { Alert, AlertDescription } from "@/components/ui/feedback/Alert"
import { INDIAN_STATES, isValidGSTIN, isValidPAN, isValidPincode } from "@/src/shared"

const TOTAL_STEPS = 5

export default function OnboardingPage() {
    const router = useRouter()
    const { user, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth()

    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [isSavingDraft, setIsSavingDraft] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [completedSteps, setCompletedSteps] = useState<number[]>([])

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

    // Load draft from localStorage on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem('onboarding_draft')
        const savedStep = localStorage.getItem('onboarding_step')

        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft)
                setFormData(draft)
                toast.info("Restored your saved progress")
            } catch (e) {
                console.error("Failed to load draft:", e)
            }
        }

        if (savedStep) {
            const parsedStep = parseInt(savedStep)
            if (parsedStep >= 1 && parsedStep <= TOTAL_STEPS) {
                setStep(parsedStep)
            }
        }
    }, [])

    // Auth guard - redirect if not authenticated or already has company
    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                router.push("/login")
            } else if (user?.companyId) {
                router.push("/seller")
            } else if (step === 1 && user?.isEmailVerified) {
                // If email is verified, skip step 1
                setStep(2)
            }
        }
    }, [authLoading, isAuthenticated, user?.companyId, user?.isEmailVerified, router])

    // Auto-save draft
    const saveDraft = async () => {
        setIsSavingDraft(true)
        try {
            localStorage.setItem('onboarding_draft', JSON.stringify(formData))
            localStorage.setItem('onboarding_step', step.toString())
            toast.success("Progress saved!")
        } catch (e) {
            toast.error("Failed to save progress")
        } finally {
            setIsSavingDraft(false)
        }
    }

    const clearDraft = () => {
        localStorage.removeItem('onboarding_draft')
        localStorage.removeItem('onboarding_step')
    }

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

        // Step 1: Email verification check (auto-validated)
        if (stepNum === 1) {
            return true // Just informational, no validation needed
        }

        // Step 2: Company Details
        if (stepNum === 2) {
            if (!formData.name.trim()) {
                setError("Company name is required")
                return false
            }
            if (formData.name.trim().length < 2) {
                setError("Company name must be at least 2 characters")
                return false
            }
        }

        // Step 3: Address
        if (stepNum === 3) {
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

        // Step 4: Billing (optional)
        if (stepNum === 4) {
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

        // Step 5: Completion (no validation)
        return true
    }

    const nextStep = () => {
        if (validateStep(step)) {
            if (!completedSteps.includes(step)) {
                setCompletedSteps([...completedSteps, step])
            }
            setStep(s => s + 1)
            saveDraft() // Auto-save when moving forward
        }
    }

    const prevStep = () => {
        setStep(s => s - 1)
    }

    const goToStep = (targetStep: number) => {
        if (targetStep <= step || completedSteps.includes(targetStep - 1)) {
            setStep(targetStep)
        }
    }

    const handleSubmit = async (redirectToKyc: boolean = false) => {
        if (!validateStep(4)) return

        setIsLoading(true)
        setError(null)

        try {
            await companyApi.createCompany(formData)
            await refreshUser()
            clearDraft() // Clear saved draft after successful submission

            // Show completion step
            setStep(5)

            // Auto-redirect after celebration
            setTimeout(() => {
                if (redirectToKyc) {
                    router.push("/seller/kyc")
                } else {
                    router.push("/seller")
                }
            }, 3000)
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
                <Loader variant="spinner" size="lg" />
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

                {/* Progress Header */}
                <div className="mb-8 space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-medium text-gray-600">Getting Started</h2>
                            <p className="text-xs text-gray-500">Step {step} of {TOTAL_STEPS}</p>
                        </div>
                        {step < 5 && (
                            <button
                                onClick={saveDraft}
                                disabled={isSavingDraft}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isSavingDraft ? (
                                    <Loader variant="spinner" size="sm" />
                                ) : (
                                    <Save className="w-3 h-3" />
                                )}
                                Save Draft
                            </button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                            className="h-full bg-primaryBlue rounded-full"
                            initial={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
                            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    {/* Step Indicators */}
                    <div className="flex items-center justify-between mt-4">
                        {[
                            { num: 1, label: "Welcome", icon: Mail },
                            { num: 2, label: "Company", icon: Building2 },
                            { num: 3, label: "Address", icon: MapPin },
                            { num: 4, label: "Billing", icon: FileText },
                            { num: 5, label: "Done", icon: Check }
                        ].map((s, idx) => {
                            const Icon = s.icon
                            const isCompleted = completedSteps.includes(s.num) || step > s.num
                            const isCurrent = s.num === step
                            const isAccessible = s.num <= step || isCompleted

                            return (
                                <div key={s.num} className="flex flex-col items-center flex-1">
                                    <button
                                        onClick={() => goToStep(s.num)}
                                        disabled={!isAccessible}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all mb-2 ${isCompleted
                                            ? "bg-emerald-500 text-white"
                                            : isCurrent
                                                ? "bg-primaryBlue text-white ring-4 ring-primaryBlue/20"
                                                : "bg-gray-200 text-gray-500"
                                            } ${isAccessible ? "cursor-pointer hover:scale-110" : "cursor-not-allowed opacity-50"}`}
                                    >
                                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                    </button>
                                    <span className={`text-xs font-medium ${isCurrent ? "text-primaryBlue" : isCompleted ? "text-emerald-600" : "text-gray-500"}`}>
                                        {s.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
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

                    <AnimatePresence mode="wait">
                        {/* Step 1: Welcome & Email Verification Status */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 mx-auto bg-primaryBlue/10 rounded-full flex items-center justify-center">
                                        {user?.isEmailVerified ? (
                                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                                        ) : (
                                            <Mail className="w-10 h-10 text-primaryBlue" />
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to ShipCrowd!</h1>
                                        <p className="text-gray-600">Let's get your account set up in just a few steps</p>
                                    </div>

                                    {/* Email Verification Status */}
                                    <div className={`p-4 rounded-lg ${user?.isEmailVerified
                                        ? "bg-green-50 border border-green-200"
                                        : "bg-yellow-50 border border-yellow-200"
                                        }`}>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            {user?.isEmailVerified ? (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    <span className="font-medium text-green-900">Email Verified</span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                                                    <span className="font-medium text-yellow-900">Email Not Verified</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-700">
                                            {user?.isEmailVerified
                                                ? `Your email (${user?.email}) has been verified successfully.`
                                                : `Please check your inbox for a verification email sent to ${user?.email}.`
                                            }
                                        </p>
                                        {!user?.isEmailVerified && (
                                            <Link
                                                href="/login"
                                                className="inline-block mt-2 text-sm text-primaryBlue hover:underline"
                                            >
                                                Resend verification email
                                            </Link>
                                        )}
                                    </div>

                                    {/* What's Next */}
                                    <div className="text-left mt-8 p-6 bg-gray-50 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3">What's next?</h3>
                                        <ul className="space-y-2 text-sm text-gray-600">
                                            <li className="flex items-start gap-2">
                                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>Set up your company profile</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>Add business address and billing information</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>Complete KYC verification (recommended)</span>
                                            </li>
                                        </ul>
                                        <p className="text-xs text-gray-500 mt-4">
                                            This should only take 5-10 minutes to complete.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Company Info */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
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
                            </motion.div>
                        )}

                        {/* Step 3: Address */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
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
                            </motion.div>
                        )}

                        {/* Step 4: Billing */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
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
                            </motion.div>
                        )}

                        {/* Step 5: Completion */}
                        {step === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-6 py-8"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                                    className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center"
                                >
                                    <PartyPopper className="w-12 h-12 text-green-600" />
                                </motion.div>

                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">All Set!</h1>
                                    <p className="text-gray-600">
                                        Your account is ready. You'll be redirected to your dashboard shortly.
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
                                    <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
                                    <ul className="space-y-2 text-sm text-gray-700">
                                        <li className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>Complete KYC verification to unlock all features</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>Set up your first courier integration</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>Configure pickup addresses</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="flex gap-3 justify-center pt-4">
                                    <LoadingButton
                                        onClick={() => handleSubmit(true)}
                                        className="px-6 py-3 bg-primaryBlue hover:bg-primaryBlue/90"
                                    >
                                        Complete KYC Now
                                    </LoadingButton>
                                    <button
                                        onClick={() => router.push('/seller')}
                                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation - Hidden on step 5 */}
                    {step < 5 && (
                        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                            {step > 1 ? (
                                <button
                                    onClick={prevStep}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                            ) : <div />}

                            {step < 4 ? (
                                <button
                                    onClick={nextStep}
                                    className="flex items-center gap-2 px-6 py-3 bg-primaryBlue text-white rounded-lg hover:bg-primaryBlue/90 font-medium"
                                >
                                    Continue <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <LoadingButton
                                    onClick={() => handleSubmit(false)}
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
                    )}
                </motion.div>

                {/* Skip for now - Hidden on step 5 */}
                {step < 5 && (
                    <p className="text-center mt-6 text-sm text-gray-500">
                        <Link href="/seller" className="text-primaryBlue hover:underline">
                            Skip for now
                        </Link>
                        {" "}— you can complete this later
                    </p>
                )}
            </div>
        </div>
    )
}
