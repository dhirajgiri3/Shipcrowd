"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
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
    ChevronRight,
    AlertTriangle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { kycApi } from "@/src/core/api";
import type { DocumentVerificationState } from "@/src/core/api";
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
    state: DocumentVerificationState;
    loading: boolean;
    error?: string;
    data?: any;
    verifiedAt?: string | null;
    expiresAt?: string | null;
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
    const [panVerification, setPanVerification] = useState<VerificationStatus>({ state: 'not_started', loading: false });
    const [bankVerification, setBankVerification] = useState<VerificationStatus>({ state: 'not_started', loading: false });
    const [gstinVerification, setGstinVerification] = useState<VerificationStatus>({ state: 'not_started', loading: false });
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

    // Fetch existing KYC on mount - ONLY load verified documents for security
    useEffect(() => {
        const fetchKYC = async () => {
            if (!user) return;

            try {
                const response = await kycApi.getKYC();
                if (response.kyc) {
                    setExistingKYC(response.kyc);
                    const snapshot = response.snapshot;
                    const restored = response.verifiedData;

                    // ✅ BEST PRACTICE: Only restore VERIFIED documents via snapshot + verifiedData
                    if (snapshot?.pan?.state === 'verified' && restored?.pan?.number) {
                        setPanVerification({
                            state: 'verified',
                            loading: false,
                            data: { name: restored.pan.name || 'Verified User', pan: restored.pan.number },
                            verifiedAt: snapshot.pan.verifiedAt,
                            expiresAt: snapshot.pan.expiresAt,
                        });
                        setFormData(prev => ({ ...prev, pan: restored.pan!.number }));
                    } else if (snapshot?.pan) {
                        setPanVerification(prev => ({
                            ...prev,
                            state: snapshot.pan.state,
                            loading: false,
                            verifiedAt: snapshot.pan.verifiedAt,
                            expiresAt: snapshot.pan.expiresAt,
                        }));
                    }

                    if (snapshot?.bankAccount?.state === 'verified' && restored?.bankAccount?.accountNumber) {
                        setBankVerification({
                            state: 'verified',
                            loading: false,
                            data: {
                                accountHolderName: restored.bankAccount.accountHolderName,
                                bankName: restored.bankAccount.bankName
                            },
                            verifiedAt: snapshot.bankAccount.verifiedAt,
                            expiresAt: snapshot.bankAccount.expiresAt,
                        });
                        setFormData(prev => ({
                            ...prev,
                            accountNumber: restored.bankAccount!.accountNumber,
                            confirmAccountNumber: restored.bankAccount!.accountNumber,
                            ifscCode: restored.bankAccount!.ifscCode
                        }));

                        if (restored.bankAccount.bankName) {
                            setIfscData({
                                bank: restored.bankAccount.bankName,
                                branch: ''
                            });
                        }
                    } else if (snapshot?.bankAccount) {
                        setBankVerification(prev => ({
                            ...prev,
                            state: snapshot.bankAccount.state,
                            loading: false,
                            verifiedAt: snapshot.bankAccount.verifiedAt,
                            expiresAt: snapshot.bankAccount.expiresAt,
                        }));
                    }

                    if (snapshot?.gstin?.state === 'verified' && restored?.gstin?.number) {
                        setGstinVerification({
                            state: 'verified',
                            loading: false,
                            data: {
                                businessName: restored.gstin.businessName || '',
                                gstin: restored.gstin.number,
                                status: restored.gstin.status || ''
                            },
                            verifiedAt: snapshot.gstin.verifiedAt,
                            expiresAt: snapshot.gstin.expiresAt,
                        });
                        setFormData(prev => ({ ...prev, gstin: restored.gstin!.number }));
                    } else if (snapshot?.gstin) {
                        setGstinVerification(prev => ({
                            ...prev,
                            state: snapshot.gstin.state,
                            loading: false,
                            verifiedAt: snapshot.gstin.verifiedAt,
                            expiresAt: snapshot.gstin.expiresAt,
                        }));
                    }

                    // Load agreement status
                    if (response.kyc.completionStatus?.agreementComplete) {
                        setFormData(prev => ({ ...prev, agreementAccepted: true, confirmationAccepted: true }));
                    }
                }
            } catch (err) {
                // No existing KYC, that's fine - 404 is expected for users who haven't completed KYC
                console.log("No existing KYC record found (expected for new users)");
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
            setPanVerification({ state: 'soft_failed', loading: false, error: 'Invalid PAN format' });
            return;
        }

        setPanVerification({ state: 'pending_provider', loading: true });

        try {
            const response = await kycApi.verifyPAN({ pan: formData.pan });
            const isVerified = response.data?.verified;
            const panData = response.data?.data;
            const verificationState = response.data?.verification?.state || (isVerified ? 'verified' : 'soft_failed');
            
            if (isVerified && panData) {
                setPanVerification({
                    state: verificationState,
                    loading: false,
                    data: { 
                        name: panData.nameClean || panData.name || '',
                        pan: panData.pan 
                    },
                    verifiedAt: response.data?.verification?.verifiedAt,
                    expiresAt: response.data?.verification?.expiresAt,
                });
                showSuccessToast('PAN verified successfully!');
            } else {
                setPanVerification({
                    state: verificationState,
                    loading: false,
                    error: response.message || 'PAN verification failed'
                });
            }
        } catch (err: any) {
            handleApiError(err, 'PAN verification failed');
            setPanVerification({
                state: 'soft_failed',
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
            // Backend returns success in root or checks data validity
            const isValid = response.success !== false && response.data;
            if (isValid && response.data) {
                setIfscData({ 
                    bank: response.data.bankName || response.data.bank || '', 
                    branch: response.data.branch || '' 
                });
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
            setBankVerification({ state: 'soft_failed', loading: false, error: 'Invalid bank details' });
            return;
        }

        if (formData.accountNumber !== formData.confirmAccountNumber) {
            setBankVerification({ state: 'soft_failed', loading: false, error: 'Account numbers do not match' });
            return;
        }

        setBankVerification({ state: 'pending_provider', loading: true });

        try {
            const response = await kycApi.verifyBankAccount({
                accountNumber: formData.accountNumber,
                ifsc: formData.ifscCode
            });

            const isVerified = response.data?.verified;
            const bankData = response.data?.data;
            const verificationState = response.data?.verification?.state || (isVerified ? 'verified' : 'soft_failed');

            if (isVerified && bankData) {
                setBankVerification({
                    state: verificationState,
                    loading: false,
                    data: {
                        accountHolderName: bankData.accountHolderNameClean || bankData.accountHolderName || '',
                        bankName: bankData.bankName || ''
                    },
                    verifiedAt: response.data?.verification?.verifiedAt,
                    expiresAt: response.data?.verification?.expiresAt,
                });
                
                // ✅ Auto-fill bank details from verification response
                if (bankData.bankDetails) {
                    setIfscData({
                        bank: bankData.bankName || bankData.bankDetails.bankName || '',
                        branch: bankData.bankDetails.branch || ''
                    });
                } else if (bankData.bankName) {
                    setIfscData(prev => ({
                        bank: bankData.bankName || '',
                        branch: prev?.branch || ''
                    }));
                }

                // Fallback: if provider didn't return bank details, resolve via IFSC lookup
                const hasBankName = Boolean(bankData.bankName || bankData.bankDetails?.bankName || ifscData?.bank);
                const hasBranch = Boolean(bankData.bankDetails?.branch || ifscData?.branch);
                if (!hasBankName || !hasBranch) {
                    await lookupIFSC();
                }
                
                showSuccessToast('Bank account verified successfully!');
            } else {
                setBankVerification({
                    state: verificationState,
                    loading: false,
                    error: response.message || 'Bank verification failed'
                });
            }
        } catch (err: any) {
            handleApiError(err, 'Bank verification failed');
            setBankVerification({
                state: 'soft_failed',
                loading: false,
                error: err.message || 'Verification failed'
            });
        }
    }, [formData.accountNumber, formData.confirmAccountNumber, formData.ifscCode, ifscData?.bank, ifscData?.branch, lookupIFSC]);

    // GSTIN Verification
    const verifyGSTIN = useCallback(async () => {
        if (!formData.gstin) return; // GSTIN is optional

        if (!isValidGSTIN(formData.gstin)) {
            setGstinVerification({ state: 'soft_failed', loading: false, error: 'Invalid GSTIN format' });
            return;
        }

        setGstinVerification({ state: 'pending_provider', loading: true });

        try {
            const response = await kycApi.verifyGSTIN({ gstin: formData.gstin });
            const isVerified = response.data?.verified;
            const businessData = response.data?.businessInfo;
            const verificationState = response.data?.verification?.state || (isVerified ? 'verified' : 'soft_failed');
            
            if (isVerified && businessData) {
                setGstinVerification({
                    state: verificationState,
                    loading: false,
                    data: {
                        businessName: businessData.businessName || '',
                        gstin: businessData.gstin || formData.gstin,
                        status: businessData.status || ''
                    },
                    verifiedAt: response.data?.verification?.verifiedAt,
                    expiresAt: response.data?.verification?.expiresAt,
                });
                showSuccessToast('GSTIN verified!');
            } else {
                setGstinVerification({
                    state: verificationState,
                    loading: false,
                    error: response.message || 'GSTIN verification failed'
                });
            }
        } catch (err: any) {
            handleApiError(err, 'GSTIN verification failed');
            setGstinVerification({
                state: 'soft_failed',
                loading: false,
                error: err.message || 'Verification failed'
            });
        }
    }, [formData.gstin]);

    const invalidateDocument = useCallback(async (documentType: 'pan' | 'bankAccount' | 'gstin') => {
        try {
            await kycApi.invalidateDocument(documentType);

            if (documentType === 'pan') {
                setPanVerification({ state: 'not_started', loading: false });
                setFormData(prev => ({ ...prev, pan: '' }));
            }

            if (documentType === 'bankAccount') {
                setBankVerification({ state: 'not_started', loading: false });
                setFormData(prev => ({
                    ...prev,
                    accountNumber: '',
                    confirmAccountNumber: '',
                    ifscCode: ''
                }));
                setIfscData(null);
            }

            if (documentType === 'gstin') {
                setGstinVerification({ state: 'not_started', loading: false });
                setFormData(prev => ({ ...prev, gstin: '' }));
            }

            showSuccessToast('Verification cleared. Please re-verify to continue.');
        } catch (err: any) {
            handleApiError(err, 'Failed to clear verification');
        }
    }, []);

    // Step validation
    const validateCurrentStep = (): boolean => {
        setError(null);

        if (currentStep === 1) {
            if (!formData.pan || formData.pan.length !== 10) {
                setError('Please enter a valid 10-character PAN');
                return false;
            }
            if (panVerification.state !== 'verified') {
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
            if (bankVerification.state !== 'verified') {
                setError('Please verify your bank account before proceeding');
                return false;
            }
        }

        if (currentStep === 3) {
            // GSTIN is optional, but if provided must be valid
            if (formData.gstin && gstinVerification.state !== 'verified') {
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
            // First update agreement status if not already done
            await kycApi.updateAgreement(true);

            await kycApi.submitKYC({
                pan: formData.pan,
                bankAccount: {
                    accountNumber: formData.accountNumber,
                    ifsc: formData.ifscCode,
                    bankName: ifscData?.bank
                },
                gstin: formData.gstin || undefined
            });

            showSuccessToast('KYC submitted successfully!');
            router.push('/seller');
        } catch (err: any) {
            handleApiError(err, 'Failed to submit KYC');
            setError(err.message || 'Failed to submit KYC');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render verification badge - Updated design
    const VerificationBadge = ({ status }: { status: VerificationStatus }) => {
        if (status.loading || status.state === 'pending_provider') {
            return (
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--primary-blue)]">
                    <Loader variant="dots" size="sm" />
                    Checking...
                </div>
            );
        }
        if (status.state === 'verified') {
            return (
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--success)] bg-[var(--success-bg)] px-2.5 py-1 rounded-full border border-[var(--success)]/20 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                </div>
            );
        }
        if (status.state === 'expired') {
            return (
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--warning)] bg-[var(--warning-bg)] px-2.5 py-1 rounded-full border border-[var(--warning)]/20 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Expired
                </div>
            );
        }
        if (status.state === 'revoked') {
            return (
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--error)] bg-[var(--error-bg)] px-2.5 py-1 rounded-full border border-[var(--error)]/20 shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Revoked
                </div>
            );
        }
        if (status.state === 'soft_failed' || status.state === 'hard_failed') {
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
    if (existingKYC?.status === 'verified' || existingKYC?.state === 'verified') {
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

    const overallStatus = existingKYC?.state || existingKYC?.status;
    const statusLabel =
        overallStatus === 'verified'
            ? 'Verified'
            : overallStatus === 'submitted' || overallStatus === 'under_review' || overallStatus === 'pending'
                ? 'Under Review'
                : overallStatus === 'action_required'
                    ? 'Action Required'
                    : overallStatus === 'expired'
                        ? 'Expired'
                        : overallStatus === 'rejected'
                            ? 'Rejected'
                            : 'Incomplete';
    const statusTone =
        overallStatus === 'action_required' || overallStatus === 'expired' || overallStatus === 'rejected'
            ? "text-[var(--error)]"
            : overallStatus === 'submitted' || overallStatus === 'under_review' || overallStatus === 'pending'
                ? "text-[var(--warning)]"
                : "text-[var(--text-primary)]";

    return (
        <div className="max-w-5xl mx-auto space-y-8 py-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="space-y-4">
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
                            statusTone
                        )}>
                            {statusLabel}
                        </span>
                    </div>
                </div>

                {/* Show progress banner if user has verified documents */}
                {(panVerification.state === 'verified' || bankVerification.state === 'verified' || gstinVerification.state === 'verified') && (
                    <Alert variant="info" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 flex items-center justify-center">
                        <AlertDescription className="flex items-center gap-2">
                            <span className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>Progress Saved!</strong> Your verified documents have been restored. Continue where you left off.
                            </span>
                        </AlertDescription>
                    </Alert>
                )}
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
                                                        disabled={panVerification.state === 'verified'}
                                                        className={cn(
                                                            "h-12 text-lg uppercase tracking-widest font-mono",
                                                            panVerification.state === 'verified' && "bg-[var(--success-bg)] border-[var(--success)]/30 text-[var(--success)]"
                                                        )}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <VerificationBadge status={panVerification} />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-xs text-[var(--text-muted)]">Enter your 10-digit PAN as per card</p>
                                                    {panVerification.state !== 'verified' ? (
                                                        <LoadingButton
                                                            onClick={verifyPAN}
                                                            isLoading={panVerification.loading}
                                                            loadingText="Verifying..."
                                                            disabled={formData.pan.length !== 10}
                                                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white h-9 px-4 text-sm"
                                                        >
                                                            Verify Now
                                                        </LoadingButton>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => invalidateDocument('pan')}
                                                            className="h-9 px-4 text-xs"
                                                        >
                                                            Change PAN
                                                        </Button>
                                                    )}
                                                </div>

                                                {panVerification.error && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mt-2 flex items-center gap-2 text-xs font-medium text-[var(--error)] bg-[var(--error-bg)]/50 p-2 rounded-lg border border-[var(--error)]/10"
                                                    >
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        {panVerification.error}
                                                    </motion.div>
                                                )}

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
                                                        disabled={bankVerification.state === 'verified'}
                                                        className="h-11 bg-[var(--bg-secondary)]"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-[var(--text-primary)]">Confirm Account Number <span className="text-[var(--error)]">*</span></label>
                                                    <Input
                                                        placeholder="Re-enter account number"
                                                        value={formData.confirmAccountNumber}
                                                        onChange={(e) => handleInputChange('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
                                                        disabled={bankVerification.state === 'verified'}
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
                                                            disabled={bankVerification.state === 'verified'}
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
                                                {bankVerification.state !== 'verified' ? (
                                                    <LoadingButton
                                                        onClick={verifyBank}
                                                        isLoading={bankVerification.loading}
                                                        loadingText="Verifying..."
                                                        disabled={!formData.accountNumber || !formData.ifscCode}
                                                        className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white px-6 h-10"
                                                    >
                                                        Verify Account
                                                    </LoadingButton>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => invalidateDocument('bankAccount')}
                                                        className="px-5 h-10 text-xs"
                                                    >
                                                        Change Account
                                                    </Button>
                                                )}

                                                <div className="flex-1">
                                                    {bankVerification.state === 'verified' && (
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

                                            {bankVerification.error && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="flex items-center gap-2 text-xs font-medium text-[var(--error)] bg-[var(--error-bg)]/50 p-2 rounded-lg border border-[var(--error)]/10"
                                                >
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    {bankVerification.error}
                                                </motion.div>
                                            )}

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
                                                        disabled={gstinVerification.state === 'verified'}
                                                        className={cn(
                                                            "h-12 text-lg uppercase tracking-widest font-mono",
                                                            gstinVerification.state === 'verified' && "bg-[var(--success-bg)] border-[var(--success)]/30 text-[var(--success)]"
                                                        )}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <VerificationBadge status={gstinVerification} />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-xs text-[var(--text-muted)]">15-digit Goods and Services Tax Identification Number</p>
                                                    {gstinVerification.state !== 'verified' && formData.gstin.length > 0 ? (
                                                        <LoadingButton
                                                            onClick={verifyGSTIN}
                                                            isLoading={gstinVerification.loading}
                                                            loadingText="Verifying..."
                                                            disabled={formData.gstin.length !== 15}
                                                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white h-9 px-4 text-sm"
                                                        >
                                                            Verify Now
                                                        </LoadingButton>
                                                    ) : gstinVerification.state === 'verified' ? (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => invalidateDocument('gstin')}
                                                            className="h-9 px-4 text-xs"
                                                        >
                                                            Change GSTIN
                                                        </Button>
                                                    ) : null}
                                                </div>

                                                {gstinVerification.error && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mt-2 flex items-center gap-2 text-xs font-medium text-[var(--error)] bg-[var(--error-bg)]/50 p-2 rounded-lg border border-[var(--error)]/10"
                                                    >
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        {gstinVerification.error}
                                                    </motion.div>
                                                )}
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
