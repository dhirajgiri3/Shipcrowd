"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    User,
    Building2,
    Landmark,
    FileCheck,
    CheckCircle2,
    ChevronRight,
    Upload,
    ArrowLeft,
    ArrowRight,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// KYC Steps Configuration
const kycSteps = [
    { id: 'personal', label: 'Personal Info', icon: User, description: 'Your identity details' },
    { id: 'company', label: 'Company Info', icon: Building2, description: 'Business registration' },
    { id: 'bank', label: 'Bank Details', icon: Landmark, description: 'Payment information' },
    { id: 'agreement', label: 'Agreement', icon: FileCheck, description: 'Terms & conditions' },
];

// Mock KYC Status
const mockKycStatus = {
    status: 'incomplete' as 'incomplete' | 'pending' | 'verified' | 'rejected',
    completedSteps: ['personal'],
    currentStep: 'company',
};

export default function KycPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Personal Info
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        pan: '',
        aadhaar: '',
        // Company Info
        companyName: '',
        gstNumber: '',
        companyType: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        // Bank Details
        accountHolderName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        ifscCode: '',
        bankName: '',
        branchName: '',
        // Agreement
        agreementAccepted: false,
    });

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const nextStep = () => {
        if (currentStep < 4) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const getStepStatus = (stepIndex: number) => {
        if (stepIndex + 1 < currentStep) return 'completed';
        if (stepIndex + 1 === currentStep) return 'current';
        return 'upcoming';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Complete Your KYC</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Verify your identity to start shipping with ShipCrowd
                    </p>
                </div>
                <Badge variant={mockKycStatus.status === 'verified' ? 'success' : 'warning'}>
                    {mockKycStatus.status === 'verified' ? 'Verified' : 'Pending Verification'}
                </Badge>
            </div>

            {/* Progress Steps */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        {kycSteps.map((step, index) => {
                            const status = getStepStatus(index);
                            const StepIcon = step.icon;

                            return (
                                <div key={step.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={cn(
                                                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                                                status === 'completed' && "bg-emerald-500 text-white",
                                                status === 'current' && "bg-[#2525FF] text-white shadow-lg shadow-[#2525FF]/30",
                                                status === 'upcoming' && "bg-gray-100 text-gray-400"
                                            )}
                                        >
                                            {status === 'completed' ? (
                                                <CheckCircle2 className="h-6 w-6" />
                                            ) : (
                                                <StepIcon className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div className="mt-3 text-center">
                                            <p className={cn(
                                                "text-sm font-medium",
                                                status === 'current' ? "text-gray-900" : "text-gray-500"
                                            )}>
                                                {step.label}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                    {index < kycSteps.length - 1 && (
                                        <div className={cn(
                                            "flex-1 h-0.5 mx-4 transition-colors duration-300",
                                            status === 'completed' ? "bg-emerald-500" : "bg-gray-200"
                                        )} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Form Cards */}
            <div className="grid gap-6">
                {/* Step 1: Personal Info */}
                {currentStep === 1 && (
                    <Card className="animate-in slide-in-from-right duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-[#2525FF]" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                Please provide your personal details as per your government ID
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">First Name *</label>
                                    <Input
                                        placeholder="Enter first name"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Last Name *</label>
                                    <Input
                                        placeholder="Enter last name"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Email Address *</label>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                                    <Input
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">PAN Number *</label>
                                    <Input
                                        placeholder="ABCDE1234F"
                                        value={formData.pan}
                                        onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                                        maxLength={10}
                                    />
                                    <p className="text-xs text-gray-400">10-character alphanumeric PAN</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Aadhaar Number *</label>
                                    <Input
                                        placeholder="1234 5678 9012"
                                        value={formData.aadhaar}
                                        onChange={(e) => handleInputChange('aadhaar', e.target.value)}
                                        maxLength={14}
                                    />
                                    <p className="text-xs text-gray-400">12-digit Aadhaar number</p>
                                </div>
                            </div>

                            {/* Document Upload Section */}
                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-medium text-gray-900 mb-4">Upload Documents</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#2525FF]/50 transition-colors cursor-pointer">
                                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-gray-700">PAN Card</p>
                                        <p className="text-xs text-gray-400 mt-1">Upload front side (PDF/JPG/PNG, max 2MB)</p>
                                    </div>
                                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#2525FF]/50 transition-colors cursor-pointer">
                                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-gray-700">Aadhaar Card</p>
                                        <p className="text-xs text-gray-400 mt-1">Upload front & back (PDF/JPG/PNG, max 2MB)</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Company Info */}
                {currentStep === 2 && (
                    <Card className="animate-in slide-in-from-right duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-[#2525FF]" />
                                Company Information
                            </CardTitle>
                            <CardDescription>
                                Provide your business registration details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Company Name *</label>
                                    <Input
                                        placeholder="Your Company Pvt. Ltd."
                                        value={formData.companyName}
                                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Company Type *</label>
                                    <select
                                        className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-300 transition-colors"
                                        value={formData.companyType}
                                        onChange={(e) => handleInputChange('companyType', e.target.value)}
                                    >
                                        <option value="">Select company type</option>
                                        <option value="proprietorship">Proprietorship</option>
                                        <option value="partnership">Partnership</option>
                                        <option value="llp">LLP</option>
                                        <option value="pvt-ltd">Private Limited</option>
                                        <option value="public">Public Limited</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">GST Number *</label>
                                <Input
                                    placeholder="22AAAAA0000A1Z5"
                                    value={formData.gstNumber}
                                    onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
                                    maxLength={15}
                                />
                                <p className="text-xs text-gray-400">15-character GST Identification Number</p>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-medium text-gray-900 mb-4">Registered Address</h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Address Line 1 *</label>
                                        <Input
                                            placeholder="Building, Street"
                                            value={formData.addressLine1}
                                            onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Address Line 2</label>
                                        <Input
                                            placeholder="Landmark, Area (Optional)"
                                            value={formData.addressLine2}
                                            onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">City *</label>
                                            <Input
                                                placeholder="Mumbai"
                                                value={formData.city}
                                                onChange={(e) => handleInputChange('city', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">State *</label>
                                            <Input
                                                placeholder="Maharashtra"
                                                value={formData.state}
                                                onChange={(e) => handleInputChange('state', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2 md:col-span-2">
                                            <label className="text-sm font-medium text-gray-700">Pincode *</label>
                                            <Input
                                                placeholder="400001"
                                                value={formData.pincode}
                                                onChange={(e) => handleInputChange('pincode', e.target.value)}
                                                maxLength={6}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* GST Certificate Upload */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#2525FF]/50 transition-colors cursor-pointer">
                                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700">GST Certificate</p>
                                    <p className="text-xs text-gray-400 mt-1">Upload GST registration certificate (PDF, max 5MB)</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Bank Details */}
                {currentStep === 3 && (
                    <Card className="animate-in slide-in-from-right duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Landmark className="h-5 w-5 text-[#2525FF]" />
                                Bank Account Details
                            </CardTitle>
                            <CardDescription>
                                Add your bank account for COD remittance and refunds
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">Important</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        Bank account must be in the name of the registered business or proprietor.
                                        Personal savings accounts are not accepted for business transactions.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Account Holder Name *</label>
                                <Input
                                    placeholder="As per bank records"
                                    value={formData.accountHolderName}
                                    onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Account Number *</label>
                                    <Input
                                        type="password"
                                        placeholder="Enter account number"
                                        value={formData.accountNumber}
                                        onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Confirm Account Number *</label>
                                    <Input
                                        placeholder="Re-enter account number"
                                        value={formData.confirmAccountNumber}
                                        onChange={(e) => handleInputChange('confirmAccountNumber', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">IFSC Code *</label>
                                    <Input
                                        placeholder="SBIN0001234"
                                        value={formData.ifscCode}
                                        onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                                        maxLength={11}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Bank Name</label>
                                    <Input
                                        placeholder="Auto-filled from IFSC"
                                        value={formData.bankName}
                                        onChange={(e) => handleInputChange('bankName', e.target.value)}
                                        disabled
                                        className="bg-gray-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Branch Name</label>
                                    <Input
                                        placeholder="Auto-filled from IFSC"
                                        value={formData.branchName}
                                        onChange={(e) => handleInputChange('branchName', e.target.value)}
                                        disabled
                                        className="bg-gray-50"
                                    />
                                </div>
                            </div>

                            {/* Cancelled Cheque Upload */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#2525FF]/50 transition-colors cursor-pointer">
                                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700">Cancelled Cheque / Bank Statement</p>
                                    <p className="text-xs text-gray-400 mt-1">Upload for bank account verification (PDF/JPG/PNG, max 2MB)</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Agreement */}
                {currentStep === 4 && (
                    <Card className="animate-in slide-in-from-right duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileCheck className="h-5 w-5 text-[#2525FF]" />
                                Terms & Agreement
                            </CardTitle>
                            <CardDescription>
                                Review and accept the ShipCrowd seller agreement
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Agreement Preview */}
                            <div className="bg-gray-50 rounded-lg p-6 max-h-80 overflow-y-auto text-sm text-gray-600 space-y-4">
                                <h4 className="font-semibold text-gray-900">ShipCrowd Seller Agreement</h4>
                                <p>
                                    This Seller Agreement ("Agreement") is entered into between ShipCrowd Technologies Pvt. Ltd.
                                    ("ShipCrowd") and the Seller ("You") upon acceptance of these terms.
                                </p>
                                <h5 className="font-medium text-gray-800">1. Services</h5>
                                <p>
                                    ShipCrowd provides a logistics aggregation platform that enables sellers to ship products
                                    through various courier partners. The platform offers rate comparison, order management,
                                    tracking, and COD remittance services.
                                </p>
                                <h5 className="font-medium text-gray-800">2. Seller Obligations</h5>
                                <p>
                                    You agree to provide accurate shipment information, maintain adequate wallet balance,
                                    and comply with all applicable laws regarding the products being shipped.
                                </p>
                                <h5 className="font-medium text-gray-800">3. Payment Terms</h5>
                                <p>
                                    COD remittance will be processed within 2-3 business days after delivery confirmation.
                                    Shipping charges will be deducted from your wallet balance at the time of booking.
                                </p>
                                <h5 className="font-medium text-gray-800">4. Liability</h5>
                                <p>
                                    ShipCrowd's liability for lost or damaged shipments is limited to the declared value
                                    or the courier partner's standard liability, whichever is lower.
                                </p>
                                <h5 className="font-medium text-gray-800">5. Termination</h5>
                                <p>
                                    Either party may terminate this agreement with 30 days written notice. Outstanding
                                    balances will be settled within 15 business days of termination.
                                </p>
                            </div>

                            {/* Checkboxes */}
                            <div className="space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2525FF] focus:ring-[#2525FF]"
                                        checked={formData.agreementAccepted}
                                        onChange={(e) => handleInputChange('agreementAccepted', e.target.checked)}
                                    />
                                    <span className="text-sm text-gray-600">
                                        I have read and agree to the ShipCrowd Seller Agreement,
                                        <a href="#" className="text-[#2525FF] hover:underline ml-1">Terms of Service</a>, and
                                        <a href="#" className="text-[#2525FF] hover:underline ml-1">Privacy Policy</a>.
                                    </span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2525FF] focus:ring-[#2525FF]"
                                    />
                                    <span className="text-sm text-gray-600">
                                        I confirm that all information provided is accurate and I am authorized to
                                        enter into this agreement on behalf of my business.
                                    </span>
                                </label>
                            </div>

                            {/* Digital Signature */}
                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-medium text-gray-900 mb-4">Digital Signature</h4>
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-[#2525FF]/50 transition-colors cursor-pointer bg-gray-50">
                                    <p className="text-sm text-gray-500">Click to draw your signature or type your name</p>
                                    <p className="text-xs text-gray-400 mt-2">This will serve as your electronic signature</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
                <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                </Button>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                    Step {currentStep} of {kycSteps.length}
                </div>

                {currentStep < 4 ? (
                    <Button onClick={nextStep} className="gap-2">
                        Next Step
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        onClick={() => alert('KYC Submitted! (Mock)')}
                        disabled={!formData.agreementAccepted}
                        className="gap-2"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Submit KYC
                    </Button>
                )}
            </div>
        </div>
    );
}
