"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { showSuccessToast } from '@/src/lib/error';
import {
    User,
    Building2,
    Landmark,
    FileCheck,
    CheckCircle2,
    ArrowLeft,
    ArrowRight,
    AlertCircle,
    CheckCircle,
    XCircle,
    ShieldCheck,
    Briefcase,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { kycApi } from "@/src/core/api";
import { useAuth } from '@/src/features/auth';
import { isValidPAN, isValidGSTIN, isValidIFSC, isValidBankAccount, formatPAN, formatGSTIN, formatIFSC } from '@/src/lib/utils';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { LoadingButton } from '@/src/components/ui/utility/LoadingButton';
import { Loader } from '@/src/components/ui';

// KYC Steps Configuration
const kycSteps = [
    { id: 'personal', label: 'Personal Info', icon: User, description: 'Verify PAN Identity' },
    { id: 'bank', label: 'Bank Details', icon: Landmark, description: 'Payout Account' },
    { id: 'company', label: 'Business Info', icon: Briefcase, description: 'GSTIN (Optional)' },
    { id: 'agreement', label: 'Agreement', icon: FileCheck, description: 'Terms & Conditions' },
];

interface VerificationStatus {
    verified: boolean;
    loading: boolean;
    error?: string;
    data?: any;
}

export function KycClient() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    // Animation variants
    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingKYC, setExistingKYC] = useState<any>(null); // TODO: replace with proper KYC types

    // Verification states
    const [panVerification, setPanVerification] = useState<VerificationStatus>({ verified: false, loading: false });
    const [bankVerification, setBankVerification] = useState<VerificationStatus>({ verified: false, loading: false });
    const [gstinVerification, setGstinVerification] = useState<VerificationStatus>({ verified: false, loading: false });
    const [ifscData, setIfscData] = useState<{ bank: string; branch: string } | null>(null);

    // Form data
    const [formData, setFormData] = useState({
        // Personal
        pan: '',
        // Bank
        accountNumber: '',
        confirmAccountNumber: '',
        ifscCode: '',
        // Company
        gstin: '',
        // Agreement
        agreementAccepted: false,
        confirmationAccepted: false,
    });

    // Fetch existing KYC on mount
    useEffect(() => {
        const fetchKYC = async () => {
            if (!user) return;

            try {
                const response = await kycApi.getKYC();
                if (response.kyc) {
                    setExistingKYC(response.kyc);
                    // Pre-fill form if KYC exists
                    const docs = response.kyc.documents || [];
                    const panDoc = docs.find(d => d.type === 'pan');
                    const bankDoc = docs.find(d => d.type === 'bank_account');
                    const gstinDoc = docs.find(d => d.type === 'gstin');

                    if (panDoc?.status === 'verified') {
                        setPanVerification({ verified: true, loading: false, data: { name: 'Verified User' } }); // Data might need to be fetched or stored differently if not in doc
                        setFormData(prev => ({ ...prev, pan: panDoc.number }));
                    }
                    if (bankDoc?.status === 'verified') {
                        setBankVerification({ verified: true, loading: false });
                        setFormData(prev => ({ ...prev, accountNumber: bankDoc.number, confirmAccountNumber: bankDoc.number }));
                    }
                    if (gstinDoc?.status === 'verified') {
                        setGstinVerification({ verified: true, loading: false });
                        setFormData(prev => ({ ...prev, gstin: gstinDoc.number }));
                    }

                    if (response.kyc.agreementAccepted) {
                        setFormData(prev => ({ ...prev, agreementAccepted: true, confirmationAccepted: true }));
                    }
                }
            } catch (err) {
                // No existing KYC, that's fine
                console.error("Error fetching KYC:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && user) {
            fetchKYC();
        } else if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    // PAN Verification
    const verifyPAN = useCallback(async () => {
        if (!isValidPAN(formData.pan) || formData.pan.length !== 10) {
            setPanVerification({ verified: false, loading: false, error: 'Invalid PAN format' });
            return;
        }

        setPanVerification({ verified: false, loading: true });

        try {
            const response = await kycApi.verifyPAN({ panNumber: formData.pan });
            if (response.verified) {
                setPanVerification({
                    verified: true,
                    loading: false,
                    data: response.data
                });
                showSuccessToast('PAN verified successfully!');
            } else {
                setPanVerification({
                    verified: false,
                    loading: false,
                    error: response.message || 'PAN verification failed'
                });
            }
        } catch (err: any) {
            setPanVerification({
                verified: false,
                loading: false,
                error: err.message || 'Verification failed'
            });
        }
    }, [formData.pan]);

    // IFSC Lookup
    const lookupIFSC = useCallback(async () => {
        if (!isValidIFSC(formData.ifscCode) || formData.ifscCode.length !== 11) {
            setIfscData(null);
            return;
        }

        try {
            const response = await kycApi.verifyIFSC(formData.ifscCode);
            if (response.success && response.data) {
                setIfscData({ bank: response.data.bank, branch: response.data.branch });
            } else {
                setIfscData(null);
            }
        } catch (err) {
            console.error("IFSC Lookup failed", err);
            setIfscData(null);
        }
    }, [formData.ifscCode]);

    // Bank Verification
    const verifyBank = useCallback(async () => {
        if (!isValidBankAccount(formData.accountNumber) || !isValidIFSC(formData.ifscCode)) {
            setBankVerification({ verified: false, loading: false, error: 'Invalid bank details' });
            return;
        }

        if (formData.accountNumber !== formData.confirmAccountNumber) {
            setBankVerification({ verified: false, loading: false, error: 'Account numbers do not match' });
            return;
        }

        setBankVerification({ verified: false, loading: true });

        try {
            const response = await kycApi.verifyBankAccount({
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode
            });

            if (response.verified) {
                setBankVerification({
                    verified: true,
                    loading: false,
                    data: response.data
                });
                showSuccessToast('Bank account verified successfully!');
            } else {
                setBankVerification({
                    verified: false,
                    loading: false,
                    error: response.message || 'Bank verification failed'
                });
            }
        } catch (err: any) {
            setBankVerification({
                verified: false,
                loading: false,
                error: err.message || 'Verification failed'
            });
        }
    }, [formData.accountNumber, formData.confirmAccountNumber, formData.ifscCode]);

    // GSTIN Verification
    const verifyGSTIN = useCallback(async () => {
        if (!formData.gstin) return; // GSTIN is optional

        if (!isValidGSTIN(formData.gstin)) {
            setGstinVerification({ verified: false, loading: false, error: 'Invalid GSTIN format' });
            return;
        }

        setGstinVerification({ verified: false, loading: true });

        try {
            const response = await kycApi.verifyGSTIN({ gstin: formData.gstin });
            if (response.verified) {
                setGstinVerification({
                    verified: true,
                    loading: false,
                    data: response.data
                });
                showSuccessToast('GSTIN verified!');
            } else {
                setGstinVerification({
                    verified: false,
                    loading: false,
                    error: response.message || 'GSTIN verification failed'
                });
            }
        } catch (err: any) {
            setGstinVerification({
                verified: false,
                loading: false,
                error: err.message || 'Verification failed'
            });
        }
    }, [formData.gstin]);

    // Step validation
    const validateCurrentStep = (): boolean => {
        setError(null);

        if (currentStep === 1) {
            if (!formData.pan || formData.pan.length !== 10) {
                setError('Please enter a valid 10-character PAN');
                return false;
            }
            if (!panVerification.verified) {
                setError('Please verify your PAN before proceeding');
                return false;
            }
        }

        if (currentStep === 2) {
            if (!formData.accountNumber || !formData.ifscCode) {
                setError('Please fill all bank details');
                return false;
            }
            if (formData.accountNumber !== formData.confirmAccountNumber) {
                setError('Account numbers do not match');
                return false;
            }
            if (!bankVerification.verified) {
                setError('Please verify your bank account before proceeding');
                return false;
            }
        }

        if (currentStep === 3) {
            // GSTIN is optional, but if provided must be valid
            if (formData.gstin && !gstinVerification.verified) {
                setError('Please verify your GSTIN or leave it empty');
                return false;
            }
        }

        if (currentStep === 4) {
            if (!formData.agreementAccepted || !formData.confirmationAccepted) {
                setError('Please accept all terms to proceed');
                return false;
            }
        }

        return true;
    };

    const nextStep = () => {
        if (validateCurrentStep() && currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    // Submit KYC
    const handleSubmit = async () => {
        if (!validateCurrentStep()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await kycApi.submitKYC({
                panNumber: formData.pan,
                bankDetails: {
                    accountNumber: formData.accountNumber,
                    ifscCode: formData.ifscCode,
                    bankName: ifscData?.bank
                },
                gstin: formData.gstin || undefined
            });

            showSuccessToast('KYC submitted successfully!');
            router.push('/seller');
        } catch (err: any) {
            setError(err.message || 'Failed to submit KYC');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render verification badge - Updated design
    const VerificationBadge = ({ status }: { status: VerificationStatus }) => {
        if (status.loading) {
            return (
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--primary-blue)]">
                    <Loader variant="dots" size="sm" />
                    Checking...
                </div>
            );
        }
        if (status.verified) {
            return (
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--success)] bg-[var(--success-bg)] px-2.5 py-1 rounded-full border border-[var(--success)]/20 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                </div>
            );
        }
        if (status.error) {
            return (
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--error)] bg-[var(--error-bg)] px-2.5 py-1 rounded-full border border-[var(--error)]/20 shadow-sm">
                    <XCircle className="w-3.5 h-3.5" />
                    Failed
                </div>
            );
        }
        return null;
    };

    // Loading state
    if (isLoading || authLoading) {
        return (
            <div className="min-h-[600px] flex items-center justify-center">
                <Loader variant="spinner" size="lg" />
            </div>
        );
    }

    // Already verified
    if (existingKYC?.status === 'verified') {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <Card className="max-w-md w-full bg-[var(--bg-primary)] border-[var(--border-subtle)] shadow-xl">
                    <CardContent className="p-10 text-center flex flex-col items-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            className="w-20 h-20 bg-[var(--success-bg)] rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_var(--success)]"
                        >
                            <CheckCircle2 className="w-10 h-10 text-[var(--success)]" />
                        </motion.div>
                        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">KYC Verified</h2>
                        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                            Your account is fully verified. You can now access all features and start shipping.
                        </p>
                        <Button onClick={() => router.push('/seller')} className="w-full bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/20">
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 py-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Seller Onboarding</h1>
                    <p className="text-[var(--text-secondary)] mt-1 text-lg">
                        Complete your verification to unlock Shipcrowd
                    </p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] backdrop-blur-md">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status: </span>
                    <span className={cn(
                        "text-xs font-bold uppercase tracking-wider ml-1",
                        existingKYC?.status === 'pending' ? "text-[var(--warning)]" : "text-[var(--text-primary)]"
                    )}>
                        {existingKYC?.status === 'pending' ? 'Under Review' : 'Incomplete'}
                    </span>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Steps Sidebar / Progress */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)] sticky top-24 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary-blue-soft)]">
                            <motion.div
                                className="h-full bg-[var(--primary-blue)]"
                                initial={{ width: "25%" }}
                                animate={{ width: `${(currentStep / 4) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                {kycSteps.map((step, index) => {
                                    const stepNum = index + 1;
                                    const isActive = stepNum === currentStep;
                                    const isCompleted = stepNum < currentStep;
                                    const Icon = step.icon;

                                    return (
                                        <div key={step.id} className="relative flex items-center gap-4">
                                            {/* Connector Line */}
                                            {index < kycSteps.length - 1 && (
                                                <div className={cn(
                                                    "absolute left-5 top-10 w-0.5 h-6 -mb-4 z-0",
                                                    isCompleted ? "bg-[var(--success)]" : "bg-[var(--border-subtle)]"
                                                )} />
                                            )}

                                            <motion.div
                                                animate={{
                                                    scale: isActive ? 1.1 : 1,
                                                    backgroundColor: isActive ? 'var(--primary-blue)' : isCompleted ? 'var(--success)' : 'var(--bg-tertiary)',
                                                    borderColor: isActive ? 'var(--primary-blue)' : isCompleted ? 'var(--success)' : 'var(--border-subtle)'
                                                }}
                                                className={cn(
                                                    "relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 shadow-sm",
                                                    isCompleted || isActive ? "text-white" : "text-[var(--text-muted)]"
                                                )}
                                            >
                                                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                                            </motion.div>

                                            <div className={cn("transition-opacity duration-300", isActive ? "opacity-100" : "opacity-60")}>
                                                <p className={cn(
                                                    "text-sm font-bold",
                                                    isActive ? "text-[var(--primary-blue)]" : isCompleted ? "text-[var(--success)]" : "text-[var(--text-primary)]"
                                                )}>
                                                    {step.label}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)]">{step.description}</p>
                                            </div>

                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeStepIndicator"
                                                    className="absolute -right-2 w-1 h-8 bg-[var(--primary-blue)] rounded-l-full"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Badge */}
                    <div className="mt-6 flex items-center justify-center gap-2 text-[var(--text-muted)] opacity-70">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs font-medium">Bank-grade Security (256-bit SSL)</span>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)] shadow-lg min-h-[400px] flex flex-col">
                                <CardHeader className="border-b border-[var(--border-subtle)] pb-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]">
                                            {(() => {
                                                const Icon = kycSteps[currentStep - 1].icon;
                                                return <Icon className="w-6 h-6" />;
                                            })()}
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl text-[var(--text-primary)]">
                                                {kycSteps[currentStep - 1].label}
                                            </CardTitle>
                                            <CardDescription className="text-[var(--text-secondary)]">
                                                {currentStep === 1 && "Identity verification according to government regulations."}
                                                {currentStep === 2 && "Link your bank account for fast and secure payouts."}
                                                {currentStep === 3 && "Add your GST details to claim input tax credits."}
                                                {currentStep === 4 && "Review and accept the terms to get started."}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-6 flex-1">
                                    {/* Error Alert */}
                                    {error && (
                                        <Alert variant="error" className="mb-6 bg-[var(--error-bg)] border-[var(--error)]/20 text-[var(--error)]" dismissible onDismiss={() => setError(null)}>
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Step 1: PAN */}
                                    {currentStep === 1 && (
                                        <div className="space-y-6 max-w-lg">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-[var(--text-primary)]">Permanent Account Number (PAN) <span className="text-[var(--error)]">*</span></label>
                                                <div className="relative">
                                                    <Input
                                                        placeholder="ABCDE1234F"
                                                        value={formData.pan}
                                                        onChange={(e) => handleInputChange('pan', formatPAN(e.target.value))}
                                                        maxLength={10}
                                                        disabled={panVerification.verified}
                                                        className={cn(
                                                            "h-12 text-lg uppercase tracking-widest font-mono",
                                                            panVerification.verified && "bg-[var(--success-bg)] border-[var(--success)]/30 text-[var(--success)]"
                                                        )}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <VerificationBadge status={panVerification} />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-xs text-[var(--text-muted)]">Enter your 10-digit PAN as per card</p>
                                                    {!panVerification.verified && (
                                                        <Button
                                                            size="sm"
                                                            onClick={verifyPAN}
                                                            disabled={formData.pan.length !== 10 || panVerification.loading}
                                                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                                                        >
                                                            {panVerification.loading ? "Verifying..." : "Verify Now"}
                                                        </Button>
                                                    )}
                                                </div>

                                                {panVerification.data?.name && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="mt-4 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] flex items-center gap-3"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)]">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Name on Card</p>
                                                            <p className="text-sm font-bold text-[var(--text-primary)]">{panVerification.data.name}</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Bank */}
                                    {currentStep === 2 && (
                                        <div className="space-y-6">
                                            <div className="p-4 bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-xl flex items-start gap-3">
                                                <AlertCircle className="h-5 w-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-[var(--warning)]/90 font-medium">
                                                    Bank account must be in the name of the registered business or proprietor.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-[var(--text-primary)]">Account Number <span className="text-[var(--error)]">*</span></label>
                                                    <Input
                                                        type="password"
                                                        placeholder="Enter account number"
                                                        value={formData.accountNumber}
                                                        onChange={(e) => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                                                        disabled={bankVerification.verified}
                                                        className="h-11 bg-[var(--bg-secondary)]"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-[var(--text-primary)]">Confirm Account Number <span className="text-[var(--error)]">*</span></label>
                                                    <Input
                                                        placeholder="Re-enter account number"
                                                        value={formData.confirmAccountNumber}
                                                        onChange={(e) => handleInputChange('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
                                                        disabled={bankVerification.verified}
                                                        className="h-11 bg-[var(--bg-secondary)]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-[var(--text-primary)]">IFSC Code <span className="text-[var(--error)]">*</span></label>
                                                    <div className="relative">
                                                        <Input
                                                            placeholder="SBIN0001234"
                                                            value={formData.ifscCode}
                                                            onChange={(e) => {
                                                                handleInputChange('ifscCode', formatIFSC(e.target.value));
                                                            }}
                                                            onBlur={lookupIFSC}
                                                            maxLength={11}
                                                            disabled={bankVerification.verified}
                                                            className="h-11 uppercase font-mono"
                                                        />
                                                        {ifscData && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--success)]">
                                                                <CheckCircle2 className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-[var(--text-muted)]">Bank Name</label>
                                                    <Input
                                                        value={ifscData?.bank || ''}
                                                        placeholder="Auto-filled"
                                                        disabled
                                                        className="h-11 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-transparent"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-[var(--text-muted)]">Branch</label>
                                                    <Input
                                                        value={ifscData?.branch || ''}
                                                        placeholder="Auto-filled"
                                                        disabled
                                                        className="h-11 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-transparent"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2 flex items-center gap-4">
                                                {!bankVerification.verified && (
                                                    <Button
                                                        onClick={verifyBank}
                                                        disabled={!formData.accountNumber || !formData.ifscCode || bankVerification.loading}
                                                        className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white px-6"
                                                    >
                                                        {bankVerification.loading ? 'Verifying...' : 'Verify Account'}
                                                    </Button>
                                                )}

                                                <div className="flex-1">
                                                    {bankVerification.verified && (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="flex items-center gap-2 text-[var(--success)] font-bold bg-[var(--success-bg)] px-3 py-2 rounded-lg border border-[var(--success)]/20 w-fit"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                            Account Verified successfully
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>

                                            {bankVerification.data?.accountHolderName && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]"
                                                >
                                                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Verified Account Name:</span>
                                                    <span className="ml-2 text-sm font-mono font-bold text-[var(--text-primary)]">{bankVerification.data.accountHolderName}</span>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}

                                    {/* Step 3: GSTIN */}
                                    {currentStep === 3 && (
                                        <div className="space-y-6 max-w-lg">
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <label className="text-sm font-semibold text-[var(--text-primary)]">GST Number</label>
                                                    <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md">Optional</span>
                                                </div>
                                                <div className="relative">
                                                    <Input
                                                        placeholder="22AAAAA0000A1Z5"
                                                        value={formData.gstin}
                                                        onChange={(e) => handleInputChange('gstin', formatGSTIN(e.target.value))}
                                                        maxLength={15}
                                                        disabled={gstinVerification.verified}
                                                        className={cn(
                                                            "h-12 text-lg uppercase tracking-widest font-mono",
                                                            gstinVerification.verified && "bg-[var(--success-bg)] border-[var(--success)]/30 text-[var(--success)]"
                                                        )}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <VerificationBadge status={gstinVerification} />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-xs text-[var(--text-muted)]">15-digit Goods and Services Tax Identification Number</p>
                                                    {!gstinVerification.verified && formData.gstin.length > 0 && (
                                                        <Button
                                                            size="sm"
                                                            onClick={verifyGSTIN}
                                                            disabled={formData.gstin.length !== 15 || gstinVerification.loading}
                                                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                                                        >
                                                            {gstinVerification.loading ? "Verifying..." : "Verify Now"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {gstinVerification.data?.businessName && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]"
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Building2 className="w-5 h-5 text-[var(--primary-blue)]" />
                                                        <p className="text-xs uppercase font-bold text-[var(--text-muted)]">Registered Entity</p>
                                                    </div>
                                                    <p className="text-lg font-bold text-[var(--text-primary)]">{gstinVerification.data.businessName}</p>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}

                                    {/* Step 4: Agreement */}
                                    {currentStep === 4 && (
                                        <div className="space-y-6">
                                            <div className="bg-[var(--bg-secondary)] rounded-xl p-6 h-64 overflow-y-auto text-sm text-[var(--text-secondary)] border border-[var(--border-subtle)] custom-scrollbar">
                                                <h4 className="font-bold text-[var(--text-primary)] mb-4 text-base">Shipcrowd Seller Agreement</h4>
                                                <div className="space-y-4 leading-relaxed">
                                                    <p>This Seller Agreement ("Agreement") is entered into between Shipcrowd Technologies Pvt. Ltd. ("Shipcrowd") and the Seller ("You") upon acceptance of these terms.</p>

                                                    <h5 className="font-bold text-[var(--text-primary)] mt-4">1. Services</h5>
                                                    <p>Shipcrowd provides a logistics aggregation platform that enables sellers to ship products through various courier partners.</p>

                                                    <h5 className="font-bold text-[var(--text-primary)] mt-4">2. Payment Terms</h5>
                                                    <p>COD remittance will be processed within 2-3 business days after delivery confirmation, subject to bank holidays.</p>

                                                    <h5 className="font-bold text-[var(--text-primary)] mt-4">3. Liability</h5>
                                                    <p>Shipcrowd's liability for lost or damaged shipments is limited to the declared value or the courier partner's standard liability, whichever is lower. Insurance is optional and recommended.</p>

                                                    <h5 className="font-bold text-[var(--text-primary)] mt-4">4. Prohibited Items</h5>
                                                    <p>Seller agrees not to ship any items prohibited by law or by the courier partners (e.g., flammables, narcotics, currency).</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors border border-transparent hover:border-[var(--border-subtle)]">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                                                        checked={formData.agreementAccepted}
                                                        onChange={(e) => handleInputChange('agreementAccepted', e.target.checked)}
                                                    />
                                                    <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                                        I have read and agree to the <strong>Shipcrowd Seller Agreement</strong>, <strong>Terms of Service</strong>, and <strong>Privacy Policy</strong>.
                                                    </span>
                                                </label>
                                                <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors border border-transparent hover:border-[var(--border-subtle)]">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                                                        checked={formData.confirmationAccepted}
                                                        onChange={(e) => handleInputChange('confirmationAccepted', e.target.checked)}
                                                    />
                                                    <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                                        I confirm that all information provided is accurate and I am authorized to enter into this agreement on behalf of my business.
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>

                                <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 rounded-b-xl flex justify-between items-center">
                                    <Button
                                        variant="outline"
                                        onClick={prevStep}
                                        disabled={currentStep === 1}
                                        className="gap-2 border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Previous
                                    </Button>

                                    {currentStep < 4 ? (
                                        <Button
                                            onClick={nextStep}
                                            className="gap-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/20"
                                        >
                                            {currentStep === 3 && !formData.gstin ? 'Skip & Continue' : 'Next Step'}
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <LoadingButton
                                            onClick={handleSubmit}
                                            isLoading={isSubmitting}
                                            loadingText="Submitting..."
                                            disabled={!formData.agreementAccepted || !formData.confirmationAccepted}
                                            className="gap-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/20 w-40"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Submit KYC
                                        </LoadingButton>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
