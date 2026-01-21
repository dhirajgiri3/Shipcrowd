"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Phone, Mail, User, X, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { FormInput } from '@/src/components/ui/form/FormInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { CreateWarehousePayload } from '@/src/core/api/hooks/logistics/useWarehouses';

interface AddWarehouseFormProps {
    mode: 'create' | 'edit';
    initialData?: Partial<CreateWarehousePayload> & { _id?: string };
    onSubmit: (data: CreateWarehousePayload) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

interface FormErrors {
    name?: string;
    'address.line1'?: string;
    'address.city'?: string;
    'address.state'?: string;
    'address.postalCode'?: string;
    'contactInfo.name'?: string;
    'contactInfo.phone'?: string;
    'contactInfo.email'?: string;
}

export function AddWarehouseForm({
    mode,
    initialData,
    onSubmit,
    onCancel,
    isLoading = false,
}: AddWarehouseFormProps) {
    const [formData, setFormData] = useState<CreateWarehousePayload>({
        name: initialData?.name || '',
        address: {
            line1: initialData?.address?.line1 || '',
            line2: initialData?.address?.line2 || '',
            city: initialData?.address?.city || '',
            state: initialData?.address?.state || '',
            country: initialData?.address?.country || 'India',
            postalCode: initialData?.address?.postalCode || '',
        },
        contactInfo: {
            name: initialData?.contactInfo?.name || '',
            phone: initialData?.contactInfo?.phone || '',
            email: initialData?.contactInfo?.email || '',
            alternatePhone: initialData?.contactInfo?.alternatePhone || '',
        },
        isDefault: initialData?.isDefault || false,
    });

    const [errors, setErrors] = useState<FormErrors>({});

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Validate warehouse name
        if (!formData.name.trim()) {
            newErrors.name = 'Warehouse name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Warehouse name must be at least 2 characters';
        }

        // Validate address
        if (!formData.address.line1.trim()) {
            newErrors['address.line1'] = 'Address line 1 is required';
        } else if (formData.address.line1.trim().length < 3) {
            newErrors['address.line1'] = 'Address must be at least 3 characters';
        }

        if (!formData.address.city.trim()) {
            newErrors['address.city'] = 'City is required';
        } else if (formData.address.city.trim().length < 2) {
            newErrors['address.city'] = 'City must be at least 2 characters';
        }

        if (!formData.address.state.trim()) {
            newErrors['address.state'] = 'State is required';
        } else if (formData.address.state.trim().length < 2) {
            newErrors['address.state'] = 'State must be at least 2 characters';
        }

        if (!formData.address.postalCode.trim()) {
            newErrors['address.postalCode'] = 'Postal code is required';
        } else if (!/^[0-9]{6}$/.test(formData.address.postalCode.trim())) {
            newErrors['address.postalCode'] = 'Postal code must be 6 digits';
        }

        // Validate contact info
        if (!formData.contactInfo.name.trim()) {
            newErrors['contactInfo.name'] = 'Contact person name is required';
        } else if (formData.contactInfo.name.trim().length < 2) {
            newErrors['contactInfo.name'] = 'Contact name must be at least 2 characters';
        }

        if (!formData.contactInfo.phone.trim()) {
            newErrors['contactInfo.phone'] = 'Contact phone is required';
        } else if (!/^[0-9]{10}$/.test(formData.contactInfo.phone.trim())) {
            newErrors['contactInfo.phone'] = 'Phone must be 10 digits';
        }

        // Validate email if provided
        if (formData.contactInfo.email && formData.contactInfo.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.contactInfo.email.trim())) {
                newErrors['contactInfo.email'] = 'Invalid email format';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Clean up data before submission
        const cleanedData: CreateWarehousePayload = {
            ...formData,
            name: formData.name.trim(),
            address: {
                ...formData.address,
                line1: formData.address.line1.trim(),
                line2: formData.address.line2?.trim() || undefined,
                city: formData.address.city.trim(),
                state: formData.address.state.trim(),
                country: formData.address.country.trim(),
                postalCode: formData.address.postalCode.trim(),
            },
            contactInfo: {
                name: formData.contactInfo.name.trim(),
                phone: formData.contactInfo.phone.trim(),
                email: formData.contactInfo.email?.trim() || undefined,
                alternatePhone: formData.contactInfo.alternatePhone?.trim() || undefined,
            },
        };

        onSubmit(cleanedData);
    };

    const updateField = (path: string, value: string | boolean) => {
        const keys = path.split('.');
        setFormData((prev) => {
            const newData = { ...prev };
            let current: any = newData;

            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }

            current[keys[keys.length - 1]] = value;
            return newData;
        });

        // Clear error for this field
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[path as keyof FormErrors];
            return newErrors;
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl mx-auto"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[var(--primary-blue)]" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormInput
                            label="Warehouse Name"
                            required
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            placeholder="e.g., Mumbai Central Hub"
                            error={errors.name}
                            disabled={isLoading}
                        />
                    </CardContent>
                </Card>

                {/* Address Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-[var(--primary-blue)]" />
                            Address Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormInput
                            label="Address Line 1"
                            required
                            value={formData.address.line1}
                            onChange={(e) => updateField('address.line1', e.target.value)}
                            placeholder="Building number, street name"
                            error={errors['address.line1']}
                            disabled={isLoading}
                        />

                        <FormInput
                            label="Address Line 2"
                            value={formData.address.line2}
                            onChange={(e) => updateField('address.line2', e.target.value)}
                            placeholder="Landmark, area (optional)"
                            disabled={isLoading}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput
                                label="City"
                                required
                                value={formData.address.city}
                                onChange={(e) => updateField('address.city', e.target.value)}
                                placeholder="e.g., Mumbai"
                                error={errors['address.city']}
                                disabled={isLoading}
                            />

                            <FormInput
                                label="State"
                                required
                                value={formData.address.state}
                                onChange={(e) => updateField('address.state', e.target.value)}
                                placeholder="e.g., Maharashtra"
                                error={errors['address.state']}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput
                                label="Postal Code"
                                required
                                value={formData.address.postalCode}
                                onChange={(e) => updateField('address.postalCode', e.target.value)}
                                placeholder="e.g., 400001"
                                maxLength={6}
                                error={errors['address.postalCode']}
                                disabled={isLoading}
                            />

                            <FormInput
                                label="Country"
                                required
                                value={formData.address.country}
                                onChange={(e) => updateField('address.country', e.target.value)}
                                placeholder="India"
                                disabled={isLoading}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-[var(--primary-blue)]" />
                            Contact Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormInput
                            label="Contact Person Name"
                            required
                            value={formData.contactInfo.name}
                            onChange={(e) => updateField('contactInfo.name', e.target.value)}
                            placeholder="e.g., Rajesh Kumar"
                            error={errors['contactInfo.name']}
                            disabled={isLoading}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput
                                label="Phone Number"
                                required
                                value={formData.contactInfo.phone}
                                onChange={(e) => updateField('contactInfo.phone', e.target.value)}
                                placeholder="10-digit mobile number"
                                maxLength={10}
                                error={errors['contactInfo.phone']}
                                disabled={isLoading}
                            />

                            <FormInput
                                label="Alternate Phone"
                                value={formData.contactInfo.alternatePhone}
                                onChange={(e) => updateField('contactInfo.alternatePhone', e.target.value)}
                                placeholder="Optional"
                                maxLength={10}
                                disabled={isLoading}
                            />
                        </div>

                        <FormInput
                            label="Email"
                            type="email"
                            value={formData.contactInfo.email}
                            onChange={(e) => updateField('contactInfo.email', e.target.value)}
                            placeholder="contact@example.com (optional)"
                            error={errors['contactInfo.email']}
                            disabled={isLoading}
                        />
                    </CardContent>
                </Card>

                {/* Settings */}
                <Card>
                    <CardContent className="pt-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isDefault}
                                onChange={(e) => updateField('isDefault', e.target.checked)}
                                className="w-5 h-5 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)] focus:ring-offset-2"
                                disabled={isLoading}
                            />
                            <div>
                                <p className="font-medium text-[var(--text-primary)]">
                                    Set as default warehouse
                                </p>
                                <p className="text-sm text-[var(--text-muted)]">
                                    Use this warehouse as the default for new shipments
                                </p>
                            </div>
                        </label>
                    </CardContent>
                </Card>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isLoading}
                        className="min-w-[140px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {mode === 'create' ? 'Creating...' : 'Updating...'}
                            </>
                        ) : (
                            <>
                                {mode === 'create' ? 'Create Warehouse' : 'Update Warehouse'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </motion.div>
    );
}
