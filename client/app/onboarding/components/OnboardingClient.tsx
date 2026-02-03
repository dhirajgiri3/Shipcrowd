"use client"

import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, MapPin, FileText, ArrowRight, ArrowLeft, Check, Mail, CheckCircle2, AlertCircle, LogOut, PartyPopper } from "lucide-react"
import { Input } from '@/src/components/ui/core/Input';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { LoadingButton } from '@/src/components/ui/utility/LoadingButton';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { AddressValidation } from '@/src/features/address/components/AddressValidation';
import { useOnboarding, TOTAL_ONBOARDING_STEPS } from '@/src/core/api/hooks/auth/useOnboarding';

export function OnboardingClient() {
    const {
        step,
        formData,
        isLoading,
        isSavingDraft,
        isTransitioning,
        error,
        setError,
        fieldErrors,
        touched,
        user,
        authLoading,
        isAuthenticated,
        updateField,
        handleBlur,
        nextStep,
        prevStep,
        handleSubmit,
        handleLogout,
        handleAddressChange
    } = useOnboarding();

    // Show loading while checking auth
    if (authLoading || !isAuthenticated || user?.companyId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <Loader variant="spinner" size="lg" />
            </div>
        )
    }

    const progress = Math.round((step / TOTAL_ONBOARDING_STEPS) * 100)

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]" data-theme="light" style={{ colorScheme: 'light' }}>
            <div className="max-w-2xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="inline-block">
                        <img
                            src="https://res.cloudinary.com/divbobkmd/image/upload/v1769869575/Shipcrowd-logo_utcmu0.png"
                            alt="Shipcrowd"
                            className="h-8 rounded-full"
                        />
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error-bg)] rounded-[var(--radius-lg)] transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--text-secondary)]">
                            Step {step} of {TOTAL_ONBOARDING_STEPS}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">
                            {progress}% Complete
                        </span>
                    </div>
                    <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2 overflow-hidden">
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
                    className="bg-[var(--bg-elevated)] rounded-2xl shadow-[var(--shadow-sm)] border border-[var(--border-default)] p-8"
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
                                        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Welcome to Shipcrowd</h1>
                                        <p className="text-[var(--text-secondary)]">Let's get your account set up in just a few steps</p>
                                    </div>

                                    {/* Email Status */}
                                    <div className={`p-4 rounded-[var(--radius-lg)] border ${user?.isEmailVerified
                                        ? "bg-[var(--success-bg)] border-[var(--success)]/30"
                                        : "bg-[var(--warning-bg)] border-[var(--warning)]/30"
                                        }`}>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            {user?.isEmailVerified ? (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                                                    <span className="font-medium text-[var(--success)]">Email Verified</span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="w-5 h-5 text-[var(--warning-dark)]" />
                                                    <span className="font-medium text-[var(--warning-dark)]">Email Not Verified</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            {user?.isEmailVerified
                                                ? `Your email (${user?.email}) has been verified.`
                                                : `Please check your inbox for a verification email sent to ${user?.email}.`
                                            }
                                        </p>
                                    </div>

                                    {/* What's Next */}
                                    <div className="text-left mt-8 p-6 bg-[var(--bg-secondary)] rounded-[var(--radius-lg)]">
                                        <h3 className="font-semibold text-[var(--text-primary)] mb-3">What's next?</h3>
                                        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
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
                                        <p className="text-xs text-[var(--text-tertiary)] mt-4">
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
                                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">What's your company name?</h1>
                                    <p className="text-sm text-[var(--text-secondary)]">Enter your registered business name</p>
                                </div>

                                <div>
                                    <Input
                                        type="text"
                                        id="companyName"
                                        value={formData.name}
                                        onChange={(e) => updateField("name", e.target.value)}
                                        onBlur={(e) => handleBlur("name", e.target.value)}
                                        placeholder="e.g., Shipcrowd Logistics Pvt Ltd"
                                        size="lg" // Input component support size prop? Yes from analysis.
                                        error={!!(fieldErrors.name && touched.name)}
                                        className="text-lg"
                                    />
                                    {fieldErrors.name && touched.name ? (
                                        <p className="text-sm text-[var(--error)] mt-2 flex items-center gap-1.5">
                                            <AlertCircle className="w-4 h-4" />
                                            {fieldErrors.name}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-[var(--text-tertiary)] mt-2">
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
                                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Where is your business located?</h1>
                                    <p className="text-sm text-[var(--text-secondary)]">Start typing for smart suggestions, or enter your pincode for auto-fill</p>
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
                                                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Billing details</h1>
                                                <span className="px-2 py-0.5 text-xs font-semibold bg-[var(--bg-secondary)] text-[var(--primary-blue)] rounded-full border border-[var(--primary-blue)]/20">
                                                    Optional
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)]">Add GST and PAN for invoicing (you can skip this for now)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">GSTIN</label>
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
                                            <p className="text-xs text-[var(--error)] mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {fieldErrors['billingInfo.gstin']}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">PAN</label>
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
                                            <p className="text-xs text-[var(--error)] mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {fieldErrors['billingInfo.pan']}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <p className="text-sm text-[var(--text-secondary)]">
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
                                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
                                        Welcome Aboard!
                                    </h1>
                                    <p className="text-lg text-[var(--text-secondary)]">
                                        Your account is ready. Let's get your first shipment started.
                                    </p>
                                </div>

                                <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[var(--radius-lg)] p-6 text-left max-w-md mx-auto">
                                    <h3 className="font-semibold text-[var(--text-primary)] mb-3">What's Next?</h3>
                                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
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
                                        onClick={() => window.location.href = '/seller/kyc'} // TODO: Use router if applicable, kept simple
                                        className="w-full h-12 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)]"
                                    >
                                        Complete KYC Now
                                    </LoadingButton>
                                    <button
                                        onClick={() => window.location.href = '/seller'}
                                        className="w-full h-12 px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-[var(--bg-hover)] font-medium transition-colors"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>

                                <p className="text-xs text-[var(--text-tertiary)]">
                                    Don't worry, you can complete KYC anytime from your profile
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation */}
                    {step < 5 && (
                        <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-[var(--border-default)]">
                            {step > 1 ? (
                                <button
                                    onClick={prevStep}
                                    className="flex items-center gap-2 px-6 py-3 h-12 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                            ) : <div />}

                            {step < 4 ? (
                                <button
                                    onClick={nextStep}
                                    disabled={isTransitioning}
                                    className="flex items-center gap-2 px-8 py-3 h-12 bg-[var(--primary-blue)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--primary-blue-deep)] font-medium disabled:opacity-50 transition-all"
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
                        <p className="text-xs text-[var(--text-secondary)] flex items-center justify-center gap-1">
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
