"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    User,
    Settings,
    CheckCircle2,
    ArrowLeft,
    ChevronRight,
    Building2,
    Clock,
    Loader2,
    Mail,
    Warehouse,
    Home,
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { cn } from '@/src/lib/utils';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import { useCreateWarehouse, CreateWarehousePayload } from '@/src/core/api/hooks/logistics/useWarehouses';
import { usePincodeAutocomplete } from '@/src/core/api/hooks/logistics/usePincodeAutocomplete';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { OperatingHoursPicker, OperatingHours } from '@/src/components/ui/form/OperatingHoursPicker';
import { Switch } from '@/src/components/ui/core/Switch';
import { Label } from '@/src/components/ui/core/Label';
import { FormField } from '@/src/components/ui/form/FormField';

// Step definitions
const steps = [
    { id: 'location', title: 'Location & Identity', icon: MapPin, description: 'Address and warehouse type' },
    { id: 'operations', title: 'Operations & Contact', icon: User, description: 'Contact details and hours' },
    { id: 'config', title: 'Configuration & Review', icon: Settings, description: 'Final settings and review' },
];

// Extended form state for UI handling
interface FormState extends Partial<CreateWarehousePayload> {
    type?: string;
    whatsappEnabled?: boolean;
    uiOperatingHours?: OperatingHours;
}

export function AddWarehouseClient() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const createWarehouseMutation = useCreateWarehouse({
        onSuccess: (warehouse) => {
            showSuccessToast(`Warehouse "${warehouse.name}" created successfully!`);
            router.push('/seller/warehouses');
        },
        onError: (error: any) => {
            // Check if it's a field-specific validation error
            if (error?.field) {
                // Set inline error for the specific field
                setFieldErrors({ [error.field]: error.message });
                handleApiError(error, 'Validation failed');
            } else {
                // General error
                setFieldErrors({});
                handleApiError(error, 'Failed to create warehouse');
            }
        },
    });

    // Form state with default type
    const [formData, setFormData] = useState<FormState>({
        name: '',
        address: {
            line1: '',
            line2: '',
            city: '',
            state: '',
            country: 'India',
            postalCode: '',
        },
        contactInfo: {
            name: '',
            phone: '',
            email: '',
            alternatePhone: '',
        },
        isDefault: false,
        type: 'Owned',
        whatsappEnabled: true,
        uiOperatingHours: { weekdays: { start: '09:00', end: '18:00' }, saturday: null, sunday: null },
    });

    // Pincode Autocomplete Hook
    const {
        data: pincodeData,
        isLoading: isPincodeLoading,
        error: pincodeError
    } = usePincodeAutocomplete(formData.address?.postalCode || '');

    // Auto-fill City & State
    if (pincodeData && (formData.address?.city !== pincodeData.city || formData.address?.state !== pincodeData.state)) {
        setTimeout(() => {
            setFormData((prev) => ({
                ...prev,
                address: {
                    ...prev.address!,
                    city: pincodeData.city,
                    state: pincodeData.state,
                }
            }));
        }, 0);
    }

    const handleInputChange = (field: keyof FormState, value: any) => {
        console.log(`🔄 Field "${field}" changed to:`, value);
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (error) setError(null);
        // Clear field-specific error when user starts typing
        if (fieldErrors[field as string]) {
            setFieldErrors(prev => {
                const updated = { ...prev };
                delete updated[field as string];
                return updated;
            });
        }
    };

    const handleAddressChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            address: {
                ...prev.address!,
                [field]: value
            }
        }));
        if (error) setError(null);
    };

    const handleContactChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            contactInfo: {
                ...prev.contactInfo!,
                [field]: value
            }
        }));
        if (error) setError(null);
    };

    const validateCurrentStep = (): boolean => {
        setError(null);

        if (currentStep === 0) {
            // Step 1: Location & Identity
            if (!formData.name || formData.name.trim().length < 2) {
                setError('Warehouse name must be at least 2 characters');
                return false;
            }
            if (!formData.address?.postalCode || formData.address.postalCode.length !== 6) {
                setError('Please enter a valid 6-digit pincode');
                return false;
            }
            if (!formData.address?.line1 || formData.address.line1.trim().length < 3) {
                setError('Address line 1 is required');
                return false;
            }
            if (!formData.address?.city || !formData.address?.state) {
                setError('City and state are required');
                return false;
            }
        }

        if (currentStep === 1) {
            // Step 2: Operations & Contact
            if (!formData.contactInfo?.name || formData.contactInfo.name.trim().length < 2) {
                setError('Contact person name is required');
                return false;
            }
            if (!formData.contactInfo?.phone || formData.contactInfo.phone.length !== 10) {
                setError('Please enter a valid 10-digit phone number');
                return false;
            }
        }

        return true;
    };

    const nextStep = () => {
        // Validate current step before proceeding
        if (!validateCurrentStep()) {
            return;
        }

        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!validateCurrentStep()) return;

        // Keep isDefault as it's needed by the backend!
        const { uiOperatingHours, whatsappEnabled, ...payload } = formData;

        const operatingHours = uiOperatingHours ? {
            monday: uiOperatingHours.weekdays ? { open: uiOperatingHours.weekdays.start, close: uiOperatingHours.weekdays.end } : { open: null, close: null },
            tuesday: uiOperatingHours.weekdays ? { open: uiOperatingHours.weekdays.start, close: uiOperatingHours.weekdays.end } : { open: null, close: null },
            wednesday: uiOperatingHours.weekdays ? { open: uiOperatingHours.weekdays.start, close: uiOperatingHours.weekdays.end } : { open: null, close: null },
            thursday: uiOperatingHours.weekdays ? { open: uiOperatingHours.weekdays.start, close: uiOperatingHours.weekdays.end } : { open: null, close: null },
            friday: uiOperatingHours.weekdays ? { open: uiOperatingHours.weekdays.start, close: uiOperatingHours.weekdays.end } : { open: null, close: null },
            saturday: uiOperatingHours.saturday ? { open: uiOperatingHours.saturday.start, close: uiOperatingHours.saturday.end } : { open: null, close: null },
            sunday: uiOperatingHours.sunday ? { open: uiOperatingHours.sunday.start, close: uiOperatingHours.sunday.end } : { open: null, close: null },
        } : undefined;

        const finalPayload: CreateWarehousePayload = {
            ...payload as CreateWarehousePayload,
            operatingHours,
        };

        console.log('✅ Submitting warehouse with isDefault:', finalPayload.isDefault, finalPayload);
        createWarehouseMutation.mutate(finalPayload);
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-8">
                        {/* Warehouse Name */}
                        <FormField
                            label="Warehouse Name"
                            placeholder="e.g. Mumbai Fulfillment Center"
                            value={formData.name || ''}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            hint="A descriptive name to help identify this location"
                            error={fieldErrors.name}
                            required
                        />

                        {/* Warehouse Type Selector */}
                        <div className="space-y-2.5">
                            <label className="text-sm font-semibold text-[var(--text-primary)] block">
                                Warehouse Type <span className="text-[var(--error)] ml-1">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2.5">
                                {[
                                    { value: 'Owned', icon: Building2, label: 'Owned', desc: 'Self-managed facility' },
                                    { value: 'Rented', icon: Home, label: 'Rented', desc: 'Leased warehouse' },
                                    { value: '3PL', icon: Warehouse, label: '3PL', desc: 'Third-party logistics' }
                                ].map((type) => {
                                    const isSelected = formData.type === type.value;
                                    const Icon = type.icon;
                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => handleInputChange('type', type.value)}
                                            className={cn(
                                                'relative p-3 rounded-lg transition-all duration-200',
                                                'flex flex-col items-center justify-center gap-2 text-center',
                                                'border border-[var(--border-default)] hover:border-[var(--primary-blue)]/40',
                                                isSelected
                                                    ? 'bg-[var(--primary-blue-soft)]/10 border-[var(--primary-blue)]'
                                                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]'
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                                                isSelected
                                                    ? "bg-[var(--primary-blue)] text-white shadow-sm"
                                                    : "bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                                            )}>
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            <div className="space-y-0.5">
                                                <p className={cn(
                                                    "text-sm font-semibold transition-colors",
                                                    isSelected ? "text-[var(--primary-blue)]" : "text-[var(--text-primary)]"
                                                )}>
                                                    {type.label}
                                                </p>
                                                <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                                                    {type.desc}
                                                </p>
                                            </div>

                                            {isSelected && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--primary-blue)] rounded-full flex items-center justify-center">
                                                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="h-px bg-[var(--border-subtle)] my-2" />

                        {/* Address Section */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-[var(--primary-blue)]" />
                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                    Pickup Address
                                </h3>
                            </div>

                            {/* Pincode Field */}
                            <FormField
                                label="Pincode"
                                required
                                maxLength={6}
                                placeholder="Enter 6-digit pincode"
                                value={formData.address?.postalCode || ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    handleAddressChange('postalCode', val);
                                }}
                                className="font-mono tracking-wider"
                                hint="City and state will be auto-filled"
                                rightElement={
                                    <>
                                        {isPincodeLoading && (
                                            <Loader2 className="w-5 h-5 animate-spin text-[var(--primary-blue)]" />
                                        )}
                                        {pincodeData && (
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-md">
                                                <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                                                <span className="text-xs font-medium text-[var(--success)] hidden sm:inline-block">Verified</span>
                                            </div>
                                        )}
                                    </>
                                }
                                error={pincodeError as string}
                            />

                            {/* City & State (Auto-filled) */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    label="City"
                                    readOnly
                                    value={formData.address?.city || ''}
                                    placeholder="Auto-filled"
                                    className="cursor-not-allowed select-none opacity-60"
                                />
                                <FormField
                                    label="State"
                                    readOnly
                                    value={formData.address?.state || ''}
                                    placeholder="Auto-filled"
                                    className="cursor-not-allowed select-none opacity-60"
                                />
                            </div>

                            {/* Address Lines */}
                            <div className="space-y-4">
                                <FormField
                                    label="Address Line 1"
                                    required
                                    placeholder="Shop No., Building No., Floor"
                                    value={formData.address?.line1 || ''}
                                    onChange={(e) => handleAddressChange('line1', e.target.value)}
                                />

                                <FormField
                                    label="Address Line 2"
                                    optional
                                    placeholder="Street, Locality, Landmark"
                                    value={formData.address?.line2 || ''}
                                    onChange={(e) => handleAddressChange('line2', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 1:
                return (
                    <div className="space-y-8">
                        {/* Contact Person Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                label="Contact Person Name"
                                required
                                icon={User}
                                placeholder="e.g. Rajesh Kumar"
                                value={formData.contactInfo?.name || ''}
                                onChange={(e) => handleContactChange('name', e.target.value)}
                            />

                            <FormField
                                label="Phone Number"
                                required
                                type="tel"
                                maxLength={10}
                                placeholder="98765 43210"
                                value={formData.contactInfo?.phone || ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    handleContactChange('phone', val);
                                }}
                                className="pl-16 font-mono tracking-wide"
                                leftElement={
                                    <span className="font-medium text-[var(--text-muted)] border-r border-[var(--border-subtle)] pr-3 mr-3 select-none">
                                        +91
                                    </span>
                                }
                                rightElement={
                                    formData.contactInfo?.phone?.length === 10 && (
                                        <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                                    )
                                }
                            />

                            <FormField
                                label="Email Address"
                                optional
                                type="email"
                                placeholder="warehouse@company.com"
                                value={formData.contactInfo?.email || ''}
                                onChange={(e) => handleContactChange('email', e.target.value)}
                            />

                            <FormField
                                label="Alternate Phone"
                                optional
                                type="tel"
                                maxLength={10}
                                placeholder="Optional backup number"
                                value={formData.contactInfo?.alternatePhone || ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    handleContactChange('alternatePhone', val);
                                }}
                                className="pl-16 font-mono tracking-wide"
                                leftElement={
                                    <span className="font-medium text-[var(--text-muted)] border-r border-[var(--border-subtle)] pr-3 mr-3 select-none">
                                        +91
                                    </span>
                                }
                            />
                        </div>

                        <div className="h-px bg-[var(--border-subtle)] my-2" />

                        {/* WhatsApp Alerts */}
                        <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--success)]/20 bg-[var(--success-bg)]/30">
                            <div className="space-y-1">
                                <Label className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    Enable WhatsApp Alerts
                                </Label>
                                <p className="text-sm text-[var(--text-secondary)]">Receive pickup updates and operational alerts on {formData.contactInfo?.phone ? `+91 ${formData.contactInfo.phone}` : 'your registered number'}</p>
                            </div>
                            <Switch
                                checked={formData.whatsappEnabled}
                                onCheckedChange={(val) => handleInputChange('whatsappEnabled', val)}
                            />
                        </div>

                        {/* Operating Hours */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[var(--primary-blue)]" />
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                        Operating Hours
                                    </h3>
                                </div>
                                <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-1 rounded-md">
                                    Required for pickup scheduling
                                </span>
                            </div>

                            <OperatingHoursPicker
                                value={formData.uiOperatingHours || { weekdays: { start: '09:00', end: '18:00' }, saturday: null, sunday: null }}
                                onChange={(hours) => handleInputChange('uiOperatingHours', hours)}
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-8">
                        {/* Configuration Options */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <Settings className="w-5 h-5 text-[var(--primary-blue)]" />
                                Configuration
                            </h3>

                            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
                                <div className="space-y-1">
                                    <Label className="text-base font-semibold text-[var(--text-primary)]">Set as Default Warehouse</Label>
                                    <p className="text-sm text-[var(--text-secondary)]">This warehouse will be selected automatically for new orders</p>
                                </div>
                                <Switch
                                    checked={formData.isDefault}
                                    onCheckedChange={(val) => handleInputChange('isDefault', val)}
                                />
                            </div>
                        </div>

                        <div className="h-px bg-[var(--border-subtle)] my-2" />

                        {/* Review Summary */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-[var(--primary-blue)]" />
                                Review Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Location Summary */}
                                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] relative group hover:border-[var(--primary-blue)]/30 transition-colors">
                                    <button
                                        onClick={() => setCurrentStep(0)}
                                        className="absolute top-4 right-4 text-[var(--primary-blue)] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Edit
                                    </button>
                                    <div className="flex items-center gap-2 mb-3">
                                        <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Location</span>
                                    </div>
                                    <h4 className="text-base font-bold text-[var(--text-primary)] mb-1">{formData.name}</h4>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded-full bg-[var(--primary-blue-soft)] text-[var(--primary-blue-deep)] text-xs font-medium border border-[var(--primary-blue)]/20">
                                            {formData.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        {formData.address?.line1}<br />
                                        {formData.address?.line2 && <>{formData.address.line2}<br /></>}
                                        {formData.address?.city}, {formData.address?.state} - {formData.address?.postalCode}
                                    </p>
                                </div>

                                {/* Operations Summary */}
                                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] relative group hover:border-[var(--primary-blue)]/30 transition-colors">
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="absolute top-4 right-4 text-[var(--primary-blue)] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Edit
                                    </button>
                                    <div className="flex items-center gap-2 mb-3">
                                        <User className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Contact & Ops</span>
                                    </div>
                                    <h4 className="text-base font-bold text-[var(--text-primary)] mb-1">{formData.contactInfo?.name}</h4>
                                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                                        +91 {formData.contactInfo?.phone}<br />
                                        {formData.contactInfo?.email || 'No email provided'}
                                    </p>

                                    <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                                        <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span className="text-sm text-[var(--text-primary)] font-medium">
                                            Operating Hours Configured
                                        </span>
                                    </div>
                                    {formData.whatsappEnabled && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                            <span className="text-xs text-[var(--success)] font-medium">WhatsApp Alerts Enabled</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="mb-4 pl-0 hover:bg-transparent hover:text-[var(--primary-blue)] transition-colors text-[var(--text-secondary)]"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Warehouses
                </Button>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Add New Warehouse</h1>
                <p className="text-[var(--text-secondary)] mt-2">Set up a new pickup location for your shipments</p>
            </div>

            <div className="flex gap-8 flex-col lg:flex-row">
                {/* Steps Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="sticky top-24 space-y-1">
                        {steps.map((step, index) => {
                            const isActive = index === currentStep;
                            const isCompleted = index < currentStep;
                            const Icon = step.icon;

                            return (
                                <div key={step.id} className="relative">
                                    <button
                                        // TODO: Re-verify disabled logic before production
                                        // disabled={index > currentStep}
                                        onClick={() => setCurrentStep(index)}
                                        className={cn(
                                            'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 outline-none focus:ring-1 focus:ring-[var(--primary-blue)]/30 cursor-pointer',
                                            isActive
                                                ? 'bg-[var(--primary-blue)] text-white shadow-lg shadow-blue-500/20'
                                                : isCompleted
                                                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]' // Changed for dev access
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'w-8 h-8 rounded-lg flex items-center justify-center',
                                                isActive ? 'bg-white/20' : 'bg-[var(--bg-tertiary)]'
                                            )}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                                            ) : (
                                                <Icon className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-[var(--text-primary)]')}>
                                                {step.title}
                                            </p>
                                            <p className={cn('text-xs', isActive ? 'text-white/80' : 'text-[var(--text-muted)]')}>
                                                {step.description}
                                            </p>
                                        </div>
                                    </button>
                                    {index < steps.length - 1 && (
                                        <div
                                            className={cn(
                                                'absolute left-7 bottom-0 top-12 w-0.5 h-4 mb-2 -ml-px z-0',
                                                isCompleted ? 'bg-[var(--success)]' : 'bg-[var(--border-subtle)]'
                                            )}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Form */}
                <div className="flex-1">
                    <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)] shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                        <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
                            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                                {steps[currentStep].title}
                            </CardTitle>
                            <CardDescription className="text-[var(--text-secondary)]">
                                {steps[currentStep].description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 flex-1">
                            {error && (
                                <Alert variant="error" className="mb-6 bg-[var(--error-bg)] border-[var(--error)]/20 text-[var(--error)]">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {renderStepContent()}
                                </motion.div>
                            </AnimatePresence>
                        </CardContent>
                        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 flex justify-between items-center">
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                disabled={currentStep === 0 || createWarehouseMutation.isPending}
                                className="border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                            >
                                Previous
                            </Button>

                            {currentStep === steps.length - 1 ? (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={createWarehouseMutation.isPending}
                                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white w-40"
                                >
                                    {createWarehouseMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Warehouse'
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={nextStep}
                                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                                >
                                    Next Step <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
