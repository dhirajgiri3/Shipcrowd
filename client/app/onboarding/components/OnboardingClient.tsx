"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, MapPin, FileText, ArrowRight, ArrowLeft, Check, Mail, CheckCircle2, AlertCircle, Save, PartyPopper, LogOut } from "lucide-react"
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
    const [completedSteps, setCompletedSteps] = useState<number[]>([])
    const [announcement, setAnnouncement] = useState('')

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

    // Update screen reader announcement when step changes
    useEffect(() => {
        const stepNames = ['Welcome', 'Company Details', 'Business Address', 'Billing Information', 'Complete']
        setAnnouncement(`Step ${step} of ${TOTAL_STEPS}: ${stepNames[step - 1]}`)
    }, [step])


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

    // Save & Exit handler - allows user to continue later
    const handleSaveAndExit = () => {
        saveDraft() // Save current progress
        toast.success('Progress saved! You can resume anytime from your dashboard.')
        router.push('/seller') // Let them access limited dashboard
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

        // Step 5: Completion (no validation)

        if (!isValid) {
            setFieldErrors(newFieldErrors)
            // Show general error if needed, or just let inline errors speak
            if (stepNum === 2) setError("Please fix the errors below")
        }

        return isValid
    }

    const nextStep = async () => {
        if (validateStep(step)) {
            setIsTransitioning(true)
            if (!completedSteps.includes(step)) {
                setCompletedSteps([...completedSteps, step])
            }
            // Brief transition delay for smooth UX
            await new Promise(r => setTimeout(r, 150))
            setStep(s => s + 1)
            saveDraft() // Auto-save when moving forward
            setIsTransitioning(false)
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
            // Create company with the form data
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

            console.log('[Onboarding] Creating company with data:', companyData);
            await companyApi.createCompany(companyData);

            // Refresh user to get updated companyId
            await refreshUser();

            clearDraft(); // Clear saved draft after successful submission

            // Show completion step (user-controlled navigation, no auto-redirect)
            setStep(5);

            toast.success('Company created successfully!');
        } catch (err: any) {
            console.error('[Onboarding] Company creation error:', err);
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
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader variant="spinner" size="lg" />
            </div>
        )
    }

    // Force light theme variables for this page specifically
    const lightThemeVars = {
        '--bg-primary': 'hsl(0, 0%, 100%)',
        '--bg-secondary': 'hsl(215, 25%, 97%)',
        '--text-primary': 'hsl(222, 30%, 15%)',
        '--text-muted': 'hsl(220, 10%, 70%)',
        '--border-default': 'hsl(220, 15%, 88%)',
        '--border-focus': 'hsl(240, 100%, 57%)',
        '--primary-blue-soft': 'hsl(240, 100%, 96%)',
        // Ensure inputs don't inherit dark mode styles
        colorScheme: 'light'
    } as React.CSSProperties;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4" style={lightThemeVars}>
            {/* Screen reader announcements */}
            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {announcement}
            </div>
            <div className="max-w-3xl mx-auto">
                {/* Logo */}
                <Link href="/" className="inline-block mb-8">
                    <img src="https://res.cloudinary.com/divbobkmd/image/upload/v1767468077/Helix_logo_yopeh9.png" alt="ShipCrowd" className="h-8 rounded-full" />
                </Link>

                {/* Minimal Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <div
                                        key={s}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            s <= step
                                                ? 'w-8 bg-gradient-to-r from-blue-600 to-indigo-600'
                                                : 'w-1.5 bg-slate-300'
                                        }`}
                                    />
                                ))}
                            </div>
                            <span className="text-sm font-medium text-slate-600">
                                Step {step} of {TOTAL_STEPS}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div
                        role="progressbar"
                        aria-valuenow={Math.round((step / TOTAL_STEPS) * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Onboarding progress: Step ${step} of ${TOTAL_STEPS}`}
                        className="w-full bg-slate-200 rounded-full h-2 overflow-hidden"
                    >
                        <motion.div
                            className="h-full bg-primaryBlue rounded-full"
                            initial={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
                            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    {/* Step Indicators - Desktop */}
                    <div className="hidden md:flex items-center justify-between mt-4">
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
                                        aria-label={`${s.label}: ${isCompleted ? 'Completed' : isCurrent ? 'Current step' : 'Not started'}`}
                                        aria-current={isCurrent ? 'step' : undefined}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all mb-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primaryBlue ${isCompleted
                                            ? "bg-emerald-500 text-white"
                                            : isCurrent
                                                ? "bg-primaryBlue text-white ring-4 ring-primaryBlue/20"
                                                : "bg-slate-200 text-slate-500"
                                            } ${isAccessible ? "cursor-pointer hover:scale-110" : "cursor-not-allowed opacity-50"}`}
                                    >
                                        {isCompleted ? <Check className="w-5 h-5" aria-hidden="true" /> : <Icon className="w-5 h-5" aria-hidden="true" />}
                                    </button>
                                    <span className={`text-xs font-medium ${isCurrent ? "text-primaryBlue" : isCompleted ? "text-emerald-600" : "text-slate-500"}`}>
                                        {s.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Step Indicators - Mobile (Compact) */}
                    <div className="md:hidden mt-4 flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-primaryBlue text-white flex items-center justify-center font-semibold">
                            {step}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-500">Step {step} of {TOTAL_STEPS}</p>
                            <p className="font-medium text-slate-900">
                                {['Welcome', 'Company', 'Address', 'Billing', 'Done'][step - 1]}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card */}
                <motion.div
                    className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10"
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
                                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to ShipCrowd!</h1>
                                        <p className="text-slate-600">Let's get your account set up in just a few steps</p>
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
                                        <p className="text-sm text-slate-700">
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
                                    <div className="text-left mt-8 p-6 bg-slate-50 rounded-lg">
                                        <h3 className="font-semibold text-slate-900 mb-3">What's next?</h3>
                                        <ul className="space-y-2 text-sm text-slate-600">
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
                                        <p className="text-xs text-slate-500 mt-4">
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
                                <div className="mb-8">
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-4">
                                        <Building2 className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-slate-900 mb-2">What's your company name?</h1>
                                    <p className="text-base text-slate-500">Enter your registered business name</p>
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
                                        aria-invalid={!!(fieldErrors.name && touched.name)}
                                        aria-describedby={fieldErrors.name ? "company-name-error" : undefined}
                                        className="text-lg"
                                    />
                                    {fieldErrors.name && touched.name ? (
                                        <p id="company-name-error" className="text-sm text-red-500 mt-2 flex items-center gap-1.5" role="alert">
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
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-4">
                                        <MapPin className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Where is your business located?</h1>
                                    <p className="text-base text-slate-500">Start typing for smart suggestions, or enter your pincode for auto-fill</p>
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
                                        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex-shrink-0">
                                            <FileText className="w-7 h-7 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h1 className="text-3xl font-bold text-slate-900">Billing details</h1>
                                                <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                                                    Optional
                                                </span>
                                            </div>
                                            <p className="text-base text-slate-500">Add GST and PAN for invoicing (you can skip this for now)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-900 mb-2">GSTIN</label>
                                        <Input
                                            type="text"
                                            id="gstin"
                                            value={formData.billingInfo?.gstin || ""}
                                            onChange={(e) => updateField("billingInfo.gstin", e.target.value.toUpperCase())}
                                            onBlur={(e) => handleBlur("billingInfo.gstin", e.target.value)}
                                            placeholder="22AAAAA0000A1Z5"
                                            maxLength={15}
                                            size="lg"
                                            error={!!(fieldErrors['billingInfo.gstin'] && touched['billingInfo.gstin'])}
                                            aria-invalid={!!(fieldErrors['billingInfo.gstin'] && touched['billingInfo.gstin'])}
                                            aria-describedby={fieldErrors['billingInfo.gstin'] ? "gstin-error" : undefined}
                                        />
                                        {fieldErrors['billingInfo.gstin'] && touched['billingInfo.gstin'] && (
                                            <p id="gstin-error" className="text-xs text-red-500 mt-1 flex items-center gap-1" role="alert">
                                                <AlertCircle className="w-3 h-3" />
                                                {fieldErrors['billingInfo.gstin']}
                                            </p>
                                        )}
                                        {formData.billingInfo?.gstin && !fieldErrors['billingInfo.gstin'] && formData.billingInfo.gstin.length < 15 && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                {15 - formData.billingInfo.gstin.length} characters remaining
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
                                        {formData.billingInfo?.pan && !fieldErrors['billingInfo.pan'] && formData.billingInfo.pan.length < 10 && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                {10 - formData.billingInfo.pan.length} characters remaining
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
                                    className="w-28 h-28 mx-auto bg-gradient-to-br from-green-50 to-emerald-100 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20"
                                >
                                    <PartyPopper className="w-14 h-14 text-green-600" />
                                </motion.div>

                                <div>
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                                        Welcome Aboard! 🎉
                                    </h1>
                                    <p className="text-lg text-slate-600">
                                        Your account is ready. Let's get your first shipment started.
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left max-w-md mx-auto">
                                    <h3 className="font-semibold text-slate-900 mb-3">What's Next?</h3>
                                    <ul className="space-y-2 text-sm text-slate-700">
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

                                <div className="flex flex-col gap-3 max-w-md mx-auto pt-4">
                                    <LoadingButton
                                        onClick={() => router.push('/seller/kyc')}
                                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
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

                    {/* Navigation - Hidden on step 5 */}
                    {step < 5 && (
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-8 pt-6 border-t border-slate-100">
                            {step > 1 ? (
                                <button
                                    onClick={prevStep}
                                    className="flex items-center justify-center gap-2 px-6 py-3 h-12 text-slate-600 hover:bg-slate-50 rounded-lg w-full sm:w-auto transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                            ) : <div className="hidden sm:block" />}

                            {step < 4 ? (
                                <button
                                    onClick={nextStep}
                                    disabled={isTransitioning}
                                    className="flex items-center justify-center gap-2 px-8 py-3 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium w-full sm:w-auto disabled:opacity-50 transition-all shadow-lg shadow-blue-500/30"
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
                                    onClick={() => handleSubmit(false)}
                                    isLoading={isLoading}
                                    loadingText="Creating..."
                                    className="px-8 py-3 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-full sm:w-auto shadow-lg shadow-blue-500/30"
                                >
                                    <span className="flex items-center gap-2">
                                        Complete Setup <Check className="w-4 h-4" />
                                    </span>
                                </LoadingButton>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* SECURITY: Skip button removed - onboarding is mandatory */}
            </div>

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
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>Draft saved automatically</span>
                            </>
                        )}
                    </p>
                </motion.div>
            )}
        </div>
    )
}
