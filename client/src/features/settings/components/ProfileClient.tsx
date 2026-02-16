"use client";


import { useState, useEffect } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
    Button,
    Input,
    Badge,
    PageHeaderSkeleton,
    CardSkeleton,
    Loader
} from '@/src/components/ui';
import { useLoader } from '@/src/hooks/utility/useLoader';
import {
    User,
    Building2,
    Mail,
    Phone,
    MapPin,
    Save,
    Shield,
    Globe,
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useProfile, useUpdateProfile, useCompany, useUpdateCompany } from '@/src/core/api/hooks/settings/useProfile';
import { RoleAvatar } from '@/src/components/shared/RoleAvatar';

export function ProfileClient() {
    // API Hooks
    const { data: profileData, isLoading: isLoadingProfile } = useProfile();
    const { data: companyData, isLoading: isLoadingCompany } = useCompany(profileData?.companyId || '');
    const updateProfile = useUpdateProfile();
    const updateCompany = useUpdateCompany();

    // Loader state
    const { isLoading: isSaveLoading, showLoader, startLoading, stopLoading } = useLoader({
        minDelay: 300,
        minDisplay: 500
    });

    // Local State
    const [formData, setFormData] = useState({
        name: '',
        displayName: '',
        email: '',
        phone: '',
        altPhone: '',
        website: '',
        gstin: '',
        pan: '',
        address: {
            line1: '',
            line2: '',
            city: '',
            state: '',
            pincode: '',
        }
    });
    const { addToast } = useToast();

    // Sync API data with form state
    useEffect(() => {
        if (profileData && companyData) {
            setFormData({
                name: companyData.name || '',
                displayName: profileData.name || '',
                email: profileData.email || '',
                phone: profileData.phone || '',
                altPhone: '', // Not available in current API
                website: '', // Not available in current API
                gstin: companyData.billingInfo?.gstin || '',
                pan: companyData.billingInfo?.pan || '',
                address: {
                    line1: companyData.address?.line1 || '',
                    line2: companyData.address?.line2 || '',
                    city: companyData.address?.city || '',
                    state: companyData.address?.state || '',
                    pincode: companyData.address?.postalCode || '',
                }
            });
        }
    }, [profileData, companyData]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            address: { ...prev.address, [field]: value }
        }));
    };

    const handleSave = async () => {
        if (!profileData || !companyData) return;

        startLoading();
        try {
            // Update profile (name, phone)
            await updateProfile.mutateAsync({
                name: formData.displayName,
                phone: formData.phone,
            });

            // Update company details (name, address)
            await updateCompany.mutateAsync({
                companyId: companyData._id,
                data: {
                    name: formData.name,
                    address: {
                        line1: formData.address.line1,
                        line2: formData.address.line2,
                        city: formData.address.city,
                        state: formData.address.state,
                        country: 'India',
                        postalCode: formData.address.pincode,
                    },
                },
            });
            addToast('Profile updated successfully', 'success');
        } catch (error) {
            // Error already handled by mutation hooks
            console.error('Profile update error:', error);
        } finally {
            stopLoading();
        }
    };

    // Loading state
    if (isLoadingProfile || isLoadingCompany) {
        return (
            <div className="space-y-6">
                <PageHeaderSkeleton />
                <div className="grid gap-6 lg:grid-cols-3">
                    <CardSkeleton className="h-96" />
                    <CardSkeleton className="lg:col-span-2 h-96" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <User className="h-6 w-6 text-[var(--primary-blue)]" />
                        Company Profile
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Manage your business profile and branding
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {companyData?.status === 'approved' && (
                        <Badge variant="success" className="gap-1">
                            <Shield className="h-3 w-3" />
                            KYC Verified
                        </Badge>
                    )}
                    {profileData?.createdAt && (
                        <Badge variant="outline">
                            Member since {new Date(profileData.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Profile Identity */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Profile Identity</CardTitle>
                        <CardDescription>Default role-based avatar is applied automatically</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center gap-3">
                            <RoleAvatar role="seller" name={formData.displayName || formData.name || 'Seller'} size="lg" />
                            <p className="text-xs text-[var(--text-muted)] text-center">
                                Avatar uploads are disabled for now.
                            </p>
                        </div>

                        <div className="border-t pt-4 space-y-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Display Name</label>
                                <Input
                                    value={formData.displayName}
                                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                                    placeholder="Short display name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5" />
                                    Website
                                </label>
                                <Input
                                    value={formData.website}
                                    onChange={(e) => handleInputChange('website', e.target.value)}
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Company Details */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[var(--primary-blue)]" />
                            Business Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Company Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    disabled
                                    className="bg-[var(--bg-secondary)]"
                                />
                                <p className="text-xs text-[var(--text-muted)]">Email cannot be changed</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5" />
                                    Primary Phone
                                </label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Alternate Phone</label>
                                <Input
                                    value={formData.altPhone}
                                    onChange={(e) => handleInputChange('altPhone', e.target.value)}
                                    placeholder="Not available in API"
                                    disabled
                                    className="bg-[var(--bg-secondary)]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">GSTIN</label>
                                <Input
                                    value={formData.gstin}
                                    onChange={(e) => handleInputChange('gstin', e.target.value)}
                                    disabled
                                    className="bg-[var(--bg-secondary)]"
                                />
                                <p className="text-xs text-[var(--text-muted)]">Contact support to update</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">PAN</label>
                                <Input
                                    value={formData.pan}
                                    onChange={(e) => handleInputChange('pan', e.target.value)}
                                    disabled
                                    className="bg-[var(--bg-secondary)]"
                                />
                                <p className="text-xs text-[var(--text-muted)]">Contact support to update</p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-[var(--primary-blue)]" />
                                Registered Address
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Address Line 1</label>
                                    <Input
                                        value={formData.address.line1}
                                        onChange={(e) => handleAddressChange('line1', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Address Line 2</label>
                                    <Input
                                        value={formData.address.line2}
                                        onChange={(e) => handleAddressChange('line2', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">City</label>
                                        <Input
                                            value={formData.address.city}
                                            onChange={(e) => handleAddressChange('city', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">State</label>
                                        <Input
                                            value={formData.address.state}
                                            onChange={(e) => handleAddressChange('state', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">PIN Code</label>
                                        <Input
                                            value={formData.address.pincode}
                                            onChange={(e) => handleAddressChange('pincode', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    isLoading={showLoader}
                    disabled={isSaveLoading}
                    className="px-8"
                >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
