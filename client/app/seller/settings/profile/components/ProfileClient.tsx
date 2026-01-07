"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/core/Card';
import { Button } from '@/components/ui/core/Button';
import { Input } from '@/components/ui/core/Input';
import { Badge } from '@/components/ui/core/Badge';
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
    Link2,
    Trash2,
    Upload,
    CheckCircle
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/components/ui/feedback/Toast';

// Mock seller profile
const mockProfile = {
    companyName: 'Fashion Hub India',
    displayName: 'Fashion Hub',
    email: 'contact@fashionhub.in',
    phone: '+91 98765 43210',
    altPhone: '+91 87654 32109',
    website: 'https://fashionhub.in',
    gstin: '29AABCU9603R1ZM',
    pan: 'AABCU9603R',
    address: {
        line1: '123, Industrial Area',
        line2: 'Phase 2, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400093',
    },
    logo: null as string | null,
    socialLinks: {
        facebook: 'https://facebook.com/fashionhubindia',
        instagram: 'https://instagram.com/fashionhubindia',
        twitter: '',
    },
    kycStatus: 'verified',
    joinedDate: '2024-02-15',
};

export function ProfileClient() {
    const [profile, setProfile] = useState(mockProfile);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const handleInputChange = (field: string, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field: string, value: string) => {
        setProfile(prev => ({
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

    const handleSave = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            addToast('Profile updated successfully!', 'success');
        }, 1000);
    };

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
                    {profile.kycStatus === 'verified' && (
                        <Badge variant="success" className="gap-1">
                            <Shield className="h-3 w-3" />
                            KYC Verified
                        </Badge>
                    )}
                    <Badge variant="outline">
                        Member since {new Date(profile.joinedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </Badge>
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
                                    value={profile.displayName}
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
                                    value={profile.website}
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
                                    value={profile.companyName}
                                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5" />
                                    Primary Phone
                                </label>
                                <Input
                                    value={profile.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Alternate Phone</label>
                                <Input
                                    value={profile.altPhone}
                                    onChange={(e) => handleInputChange('altPhone', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">GSTIN</label>
                                <Input
                                    value={profile.gstin}
                                    onChange={(e) => handleInputChange('gstin', e.target.value)}
                                    disabled
                                    className="bg-[var(--bg-secondary)]"
                                />
                                <p className="text-xs text-[var(--text-muted)]">Contact support to update</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">PAN</label>
                                <Input
                                    value={profile.pan}
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
                                        value={profile.address.line1}
                                        onChange={(e) => handleAddressChange('line1', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Address Line 2</label>
                                    <Input
                                        value={profile.address.line2}
                                        onChange={(e) => handleAddressChange('line2', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">City</label>
                                        <Input
                                            value={profile.address.city}
                                            onChange={(e) => handleAddressChange('city', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">State</label>
                                        <Input
                                            value={profile.address.state}
                                            onChange={(e) => handleAddressChange('state', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">PIN Code</label>
                                        <Input
                                            value={profile.address.pincode}
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
                <Button onClick={handleSave} isLoading={isLoading} className="px-8">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
