"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, MapPin, FileText, ArrowRight, ArrowLeft, Check, Mail, CheckCircle2, AlertCircle, LogOut, PartyPopper } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/src/features/auth"
import { Input, Textarea, Select } from '@/src/components/ui';
import { Loader, LoadingButton } from '@/src/components/ui';
import { AddressValidation } from '@/src/features/address/components/AddressValidation';
import { companyApi, CreateCompanyData, authApi } from "@/src/core/api"
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { INDIAN_STATES } from "@/src/constants";
import { isValidGSTIN, isValidPAN, isValidPincode } from "@/src/lib/utils";

const TOTAL_STEPS = 5

interface OnboardingFormData {
    name: string;
    address: {
        line1: string;
        line2: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
    billingInfo: {
        gstin: string;
        pan: string;
    };
}

export function OnboardingClient() {
    const router = useRouter()
    const { user, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth()

    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [isSavingDraft, setIsSavingDraft] = useState(false)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    // Form data
    const [formData, setFormData] = useState<OnboardingFormData>({
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

    // Auto-save form data on change (debounced)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (step > 1 && step < 5) { // Don't auto-save on welcome or completion
                saveDraft()
            }
        }, 1500) // Auto-save 1.5s after user stops typing

        return () => clearTimeout(timeoutId)
    }, [formData, step])

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

    // Memoized address change handler to prevent infinite loops
    const handleAddressChange = useCallback((addr: any) => {
        setFormData((prev: OnboardingFormData) => ({
            ...prev,
            address: {
                line1: addr.line1 || '',
                line2: addr.line2 || '',
                city: addr.city || '',
                state: addr.state || '',
                postalCode: addr.pincode || '',
                country: 'India',
            },
        }));
    }, []);

    // Auto-save draft
    const saveDraft = async () => {
        setIsSavingDraft(true)
        try {
            localStorage.setItem('onboarding_draft', JSON.stringify(formData))
            localStorage.setItem('onboarding_step', step.toString())
        } catch (e) {
            console.error("Failed to save draft:", e)
        } finally {
            setIsSavingDraft(false)
        }
    }

    const clearDraft = () => {
        localStorage.removeItem('onboarding_draft')
        localStorage.removeItem('onboarding_step')
    }

    // Logout handler - allows user to exit onboarding
    const handleLogout = async () => {
        try {
            saveDraft() // Save progress before logout
            await authApi.logout()
            router.push('/login')
        } catch (err) {
            console.error('Logout error:', err)
            toast.error('Logout failed')
        }
    }

    const updateField = (field: string, value: string) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.')
            setFormData((prev: any) => ({
                ...prev,
                [parent]: { ...(prev[parent as any] as object), [child]: value }
            }))
        } else {
            setFormData((prev: any) => ({ ...prev, [field]: value }))
        }
    }

    const validateField = (field: string, value: string): string | null => {
        switch (field) {
            case 'name':
                if (!value.trim()) return "Enter your company name"
                if (value.trim().length < 2) return "Company name must be at least 2 characters"
                return null
            case 'billingInfo.gstin':
                if (value && !isValidGSTIN(value)) return "GSTIN should be 15 characters (e.g., 22AAAAA0000A1Z5)"
                return null
            case 'billingInfo.pan':
                if (value && !isValidPAN(value)) return "PAN should be 10 characters (e.g., ABCDE1234F)"
                return null
            default:
                return null
        }
    }

    const handleBlur = (field: string, value: string) => {
        setTouched(prev => ({ ...prev, [field]: true }))
        const error = validateField(field, value)
        setFieldErrors(prev => ({
            ...prev,
            [field]: error || ""
        }))
    }

    const validateStep = (stepNum: number): boolean => {
        setError(null)
        setFieldErrors({})
        let isValid = true
        const newFieldErrors: Record<string, string> = {}

        // Step 1: Email verification check (auto-validated)
        if (stepNum === 1) {
            return true // Just informational, no validation needed
        }

        // Step 2: Company Details
        if (stepNum === 2) {
            const nameError = validateField('name', formData.name)
            if (nameError) {
                newFieldErrors.name = nameError
                isValid = false
            }
        }

        // Step 3: Address
        if (stepNum === 3) {
            const { line1, city, state, postalCode } = formData.address
            const missing: string[] = []
            if (!line1?.trim()) missing.push('Address Line 1')
            if (!city?.trim()) missing.push('City')
            if (!state) missing.push('State')
            if (!postalCode) missing.push('Postal Code')

            if (missing.length > 0) {
                setError(`Please complete: ${missing.join(', ')}`)
                return false
            }
            if (!isValidPincode(postalCode)) {
                setError("Enter a valid 6-digit pincode (e.g., 400001)")
                return false
            }
        }

        // Step 4: Billing (optional)
        if (stepNum === 4) {
            const gstin = formData.billingInfo?.gstin || ""
            const pan = formData.billingInfo?.pan || ""

            const gstinError = validateField('billingInfo.gstin', gstin)
            if (gstinError) {
                newFieldErrors['billingInfo.gstin'] = gstinError
                isValid = false
            }

            const panError = validateField('billingInfo.pan', pan)
            if (panError) {
                newFieldErrors['billingInfo.pan'] = panError
                isValid = false
            }
        }

        if (!isValid) {
            setFieldErrors(newFieldErrors)
            if (stepNum === 2) setError("Please fix the errors below")
        }

        return isValid
    }

    const nextStep = async () => {
        if (validateStep(step)) {
            setIsTransitioning(true)
            await new Promise(r => setTimeout(r, 150))
            setStep(s => s + 1)
            saveDraft()
            setIsTransitioning(false)
        }
    }

    const prevStep = () => {
        setStep(s => s - 1)
    }

    const handleSubmit = async () => {
        if (!validateStep(4)) return

        setIsLoading(true)
        setError(null)

        try {
            const companyData: CreateCompanyData = {
                name: formData.name,
                address: {
                    line1: formData.address.line1,
                    line2: formData.address.line2 || undefined,
                    city: formData.address.city,
                    state: formData.address.state,
                    country: formData.address.country || 'India',
                    postalCode: formData.address.postalCode,
                },
                billingInfo: formData.billingInfo.gstin || formData.billingInfo.pan ? {
                    gstin: formData.billingInfo.gstin || undefined,
                    pan: formData.billingInfo.pan || undefined,
                } : undefined,
            };

            await companyApi.createCompany(companyData);
            await refreshUser();
            clearDraft();
            setStep(5);
            toast.success('Company created successfully!');
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || "Failed to create company";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    // Show loading while checking auth
    if (authLoading || !isAuthenticated || user?.companyId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader variant="spinner" size="lg" />
            </div>
        )
    }

    const progress = Math.round((step / TOTAL_STEPS) * 100)

    return (
        <div className="min-h-screen bg-white" data-theme="light" style={{ colorScheme: 'light' }}>
            <div className="max-w-2xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="inline-block">
                        <img
                            src="https://res.cloudinary.com/divbobkmd/image/upload/v1767468077/Shipcrowd_logo_yopeh9.png"
                            alt="Shipcrowd"
                            className="h-8 rounded-full"
                        />
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-600">
                            Step {step} of {TOTAL_STEPS}
                        </span>
                        <span className="text-xs text-slate-500">
                            {progress}% Complete
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                            className="h-full bg-[var(--primary-blue)] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {/* Card */}
                <motion.div
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {error && (
                        <Alert variant="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <AnimatePresence mode="wait">
                        {/* Step 1: Welcome */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-[var(--primary-blue)]/10 rounded-2xl flex items-center justify-center">
                                        {user?.isEmailVerified ? (
                                            <CheckCircle2 className="w-8 h-8 text-[var(--success)]" />
                                        ) : (
                                            <Mail className="w-8 h-8 text-[var(--primary-blue)]" />
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Shipcrowd</h1>
                                        <p className="text-slate-600">Let's get your account set up in just a few steps</p>
                                    </div>

                                    {/* Email Status */}
                                    <div className={`p-4 rounded-lg border ${user?.isEmailVerified
                                        ? "bg-[var(--success-bg)] border-[var(--success)]/30"
                                        : "bg-yellow-50 border-yellow-200"
                                        }`}>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            {user?.isEmailVerified ? (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                                                    <span className="font-medium text-[var(--success)]">Email Verified</span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                                                    <span className="font-medium text-yellow-900">Email Not Verified</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-700">
                                            {user?.isEmailVerified
                                                ? `Your email (${user?.email}) has been verified.`
                                                : `Please check your inbox for a verification email sent to ${user?.email}.`
                                            }
                                        </p>
                                    </div>

                                    {/* What's Next */}
                                    <div className="text-left mt-8 p-6 bg-slate-50 rounded-lg">
                                        <h3 className="font-semibold text-slate-900 mb-3">What's next?</h3>
                                        <ul className="space-y-2 text-sm text-slate-600">
                                            <li className="flex items-start gap-2">
                                                <Check className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                                                <span>Set up your company profile</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                                                <span>Add business address and billing information</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                                                <span>Complete KYC verification (recommended)</span>
                                            </li>
                                        </ul>
                                        <p className="text-xs text-slate-500 mt-4">
                                            This should only take 5-10 minutes to complete.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Company Name */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="mb-8">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--primary-blue)]/10 rounded-xl mb-4">
                                        <Building2 className="w-6 h-6 text-[var(--primary-blue)]" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-slate-900 mb-2">What's your company name?</h1>
                                    <p className="text-sm text-slate-500">Enter your registered business name</p>
                                </div>

                                <div>
                                    <Input
                                        type="text"
                                        id="companyName"
                                        value={formData.name}
                                        onChange={(e) => updateField("name", e.target.value)}
                                        onBlur={(e) => handleBlur("name", e.target.value)}
                                        placeholder="e.g., Acme Logistics Pvt Ltd"
                                        size="lg"
                                        error={!!(fieldErrors.name && touched.name)}
                                        className="text-lg"
                                    />
                                    {fieldErrors.name && touched.name ? (
                                        <p className="text-sm text-red-500 mt-2 flex items-center gap-1.5">
                                            <AlertCircle className="w-4 h-4" />
                                            {fieldErrors.name}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-slate-400 mt-2">
                                            Use your registered legal business name
                                        </p>
                                    )}
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
                                <div className="mb-8">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--primary-blue)]/10 rounded-xl mb-4">
                                        <MapPin className="w-6 h-6 text-[var(--primary-blue)]" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Where is your business located?</h1>
                                    <p className="text-sm text-slate-500">Start typing for smart suggestions, or enter your pincode for auto-fill</p>
                                </div>

                                <AddressValidation
                                    initialAddress={{
                                        line1: formData.address.line1,
                                        line2: formData.address.line2,
                                        city: formData.address.city,
                                        state: formData.address.state,
                                        pincode: formData.address.postalCode,
                                        country: 'India',
                                    }}
                                    onAddressChange={handleAddressChange}
                                    onValidationError={(errors) => {
                                        if (errors.length > 0) {
                                            setError(errors[0].message);
                                        }
                                    }}
                                    required={true}
                                    showServiceability={true}
                                    className="space-y-4"
                                />
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
                                <div className="mb-8">
                                    <div className="flex items-start gap-4">
                                        <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--primary-blue)]/10 rounded-xl flex-shrink-0">
                                            <FileText className="w-6 h-6 text-[var(--primary-blue)]" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h1 className="text-2xl font-bold text-slate-900">Billing details</h1>
                                                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                                                    Optional
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500">Add GST and PAN for invoicing (you can skip this for now)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-900 mb-2">GSTIN</label>
                                        <Input
                                            type="text"
                                            value={formData.billingInfo?.gstin || ""}
                                            onChange={(e) => updateField("billingInfo.gstin", e.target.value.toUpperCase())}
                                            onBlur={(e) => handleBlur("billingInfo.gstin", e.target.value)}
                                            placeholder="22AAAAA0000A1Z5"
                                            maxLength={15}
                                            size="lg"
                                            error={!!(fieldErrors['billingInfo.gstin'] && touched['billingInfo.gstin'])}
                                        />
                                        {fieldErrors['billingInfo.gstin'] && touched['billingInfo.gstin'] && (
                                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {fieldErrors['billingInfo.gstin']}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-900 mb-2">PAN</label>
                                        <Input
                                            type="text"
                                            value={formData.billingInfo?.pan || ""}
                                            onChange={(e) => updateField("billingInfo.pan", e.target.value.toUpperCase())}
                                            onBlur={(e) => handleBlur("billingInfo.pan", e.target.value)}
                                            placeholder="ABCDE1234F"
                                            maxLength={10}
                                            size="lg"
                                            error={!!(fieldErrors['billingInfo.pan'] && touched['billingInfo.pan'])}
                                        />
                                        {fieldErrors['billingInfo.pan'] && touched['billingInfo.pan'] && (
                                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {fieldErrors['billingInfo.pan']}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <p className="text-sm text-slate-500">
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
                                    className="w-24 h-24 mx-auto bg-[var(--success-bg)] rounded-full flex items-center justify-center"
                                >
                                    <PartyPopper className="w-12 h-12 text-[var(--success)]" />
                                </motion.div>

                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 mb-3">
                                        Welcome Aboard!
                                    </h1>
                                    <p className="text-lg text-slate-600">
                                        Your account is ready. Let's get your first shipment started.
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left max-w-md mx-auto">
                                    <h3 className="font-semibold text-slate-900 mb-3">What's Next?</h3>
                                    <ul className="space-y-2 text-sm text-slate-700">
                                        <li className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                                            <span>Complete KYC verification to unlock all features</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                                            <span>Set up your first courier integration</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                                            <span>Configure pickup addresses</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="flex flex-col gap-3 max-w-md mx-auto pt-4">
                                    <LoadingButton
                                        onClick={() => router.push('/seller/kyc')}
                                        className="w-full h-12 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)]"
                                    >
                                        Complete KYC Now
                                    </LoadingButton>
                                    <button
                                        onClick={() => router.push('/seller')}
                                        className="w-full h-12 px-6 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>

                                <p className="text-xs text-slate-500">
                                    Don't worry, you can complete KYC anytime from your profile
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation */}
                    {step < 5 && (
                        <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-slate-200">
                            {step > 1 ? (
                                <button
                                    onClick={prevStep}
                                    className="flex items-center gap-2 px-6 py-3 h-12 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                            ) : <div />}

                            {step < 4 ? (
                                <button
                                    onClick={nextStep}
                                    disabled={isTransitioning}
                                    className="flex items-center gap-2 px-8 py-3 h-12 bg-[var(--primary-blue)] text-white rounded-lg hover:bg-[var(--primary-blue-deep)] font-medium disabled:opacity-50 transition-all"
                                >
                                    {isTransitioning ? (
                                        <>
                                            <Loader variant="spinner" size="sm" />
                                            Validating...
                                        </>
                                    ) : (
                                        <>
                                            Continue <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            ) : (
                                <LoadingButton
                                    onClick={handleSubmit}
                                    isLoading={isLoading}
                                    loadingText="Creating..."
                                    className="px-8 py-3 h-12 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)]"
                                >
                                    <span className="flex items-center gap-2">
                                        Complete Setup <Check className="w-4 h-4" />
                                    </span>
                                </LoadingButton>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Auto-save Indicator */}
                {step > 1 && step < 5 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mt-4"
                    >
                        <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                            {isSavingDraft ? (
                                <>
                                    <Loader variant="spinner" size="sm" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
                                    <span>Draft saved automatically</span>
                                </>
                            )}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
