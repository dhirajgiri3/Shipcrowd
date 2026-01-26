"use client";
export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
    Button,
    Input,
    Badge,
    PageHeaderSkeleton,
    CardSkeleton,
    Loader
} from '@/src/components/ui';
import {
    User,
    Building2,
    Mail,
    Phone,
    MapPin,
    Camera,
    Save,
    Shield,
    Globe,
    Trash2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useProfile, useUpdateProfile, useCompany, useUpdateCompany } from '@/src/core/api/hooks/settings/useProfile';

export function ProfileClient() {
    // API Hooks
    const { data: profileData, isLoading: isLoadingProfile } = useProfile();
    const { data: companyData, isLoading: isLoadingCompany } = useCompany(profileData?.companyId || '');
    const updateProfile = useUpdateProfile();
    const updateCompany = useUpdateCompany();

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
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

            if (profileData.avatar) {
                setLogoPreview(profileData.avatar);
            }
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

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                addToast('Please upload an image file', 'warning');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                addToast('Image size should be less than 2MB', 'warning');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                setLogoPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
            addToast('Logo uploaded successfully!', 'success');
        }
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        addToast('Logo removed', 'info');
    };

    const handleSave = async () => {
        if (!profileData || !companyData) return;

        try {
            // Update profile (name, phone, avatar)
            await updateProfile.mutateAsync({
                name: formData.displayName,
                phone: formData.phone,
                avatar: logoPreview || undefined,
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
        } catch (error) {
            // Error already handled by mutation hooks
            console.error('Profile update error:', error);
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
                    {companyData?.kycStatus === 'verified' && (
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
                {/* Logo & Branding */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Company Logo</CardTitle>
                        <CardDescription>Upload your company logo for invoices and labels</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden",
                                    logoPreview
                                        ? "border-transparent"
                                        : "border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:bg-[var(--primary-blue)]/5"
                                )}
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center">
                                        <Camera className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                                        <p className="text-xs text-[var(--text-muted)]">Click to upload</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
                                PNG, JPG up to 2MB<br />
                                Recommended: 200x200px
                            </p>
                            {logoPreview && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 text-[var(--error)]"
                                    onClick={handleRemoveLogo}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove
                                </Button>
                            )}
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
                    disabled={updateProfile.isPending || updateCompany.isPending}
                    className="px-8"
                >
                    {(updateProfile.isPending || updateCompany.isPending) ? (
                        <>
                            <Loader variant="spinner" size="sm" className="mr-2 border-[var(--text-on-primary)] border-t-transparent" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
