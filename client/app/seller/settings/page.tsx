"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/shared/components/card';
import { Button } from '@/src/shared/components/button';
import { Input } from '@/src/shared/components/Input';
import { Badge } from '@/src/shared/components/badge';
import { User, Bell, Lock, Globe, CreditCard, Building2, Key, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/src/shared/components/Toast';
import { useProfile, useUpdateProfile, useCompany, useUpdateCompany } from '@/src/core/api/hooks';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const { addToast } = useToast();

    // Profile data & mutations
    const { data: profileData, isLoading: profileLoading } = useProfile();
    const updateProfile = useUpdateProfile();
    const [profileForm, setProfileForm] = useState({ name: '', phone: '' });

    // Company data & mutations (companyId from profile)
    const companyId = (profileData as any)?.companyId || '';
    const { data: companyData, isLoading: companyLoading } = useCompany(companyId);
    const updateCompany = useUpdateCompany();
    const [companyForm, setCompanyForm] = useState({
        name: '',
        address: { line1: '', line2: undefined as string | undefined, city: '', state: '', postalCode: '', country: 'India' },
        billingInfo: { gstin: '', pan: '' },
    });

    // Update forms when data loads
    useEffect(() => {
        if (profileData) {
            setProfileForm({ name: profileData.name || '', phone: profileData.phone || '' });
        }
    }, [profileData]);

    useEffect(() => {
        if (companyData) {
            setCompanyForm({
                name: companyData.name || '',
                address: companyData.address ? {
                    line1: companyData.address.line1 || '',
                    line2: companyData.address.line2,
                    city: companyData.address.city || '',
                    state: companyData.address.state || '',
                    postalCode: companyData.address.postalCode || '',
                    country: companyData.address.country || 'India',
                } : { line1: '', line2: undefined, city: '', state: '', postalCode: '', country: 'India' },
                billingInfo: { gstin: companyData.billingInfo?.gstin || '', pan: companyData.billingInfo?.pan || '' },
            });
        }
    }, [companyData]);

    const handleProfileSave = () => updateProfile.mutate(profileForm);
    const handleCompanySave = () => {
        if (companyId) updateCompany.mutate({ companyId, data: companyForm });
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'company', label: 'Company', icon: Building2 },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'integrations', label: 'Integrations', icon: Globe },
        { id: 'api', label: 'API Keys', icon: Key },
        { id: 'billing', label: 'Billing', icon: CreditCard },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-64 space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 px-2">Settings</h2>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id ? 'bg-[#2525FF]/5 text-[#2525FF] border border-[#2525FF]/10' : 'text-gray-600 hover:bg-[var(--bg-hover)] hover:text-gray-900'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </aside>

                <div className="flex-1 space-y-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>Update your personal details and preferences.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {profileLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                                            <div className="h-20 w-20 rounded-xl bg-[#2525FF] flex items-center justify-center text-white text-2xl font-bold">
                                                {profileData?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <Button variant="outline" size="sm">Change Avatar</Button>
                                                <p className="text-xs text-[var(--text-muted)] mt-2">JPG, GIF or PNG. Max size of 800K</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Full Name</label>
                                            <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Email Address</label>
                                            <Input value={profileData?.email || ''} disabled />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Phone Number</label>
                                            <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 98765 43210" />
                                        </div>
                                        <div className="pt-4 flex justify-end">
                                            <Button onClick={handleProfileSave} isLoading={updateProfile.isPending}>Save Changes</Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Company Tab */}
                    {activeTab === 'company' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Company Information</CardTitle>
                                <CardDescription>Manage your business details and branding.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {companyLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Company Name</label>
                                            <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 block mb-1.5">GSTIN</label>
                                                <Input value={companyForm.billingInfo.gstin} onChange={(e) => setCompanyForm({ ...companyForm, billingInfo: { ...companyForm.billingInfo, gstin: e.target.value } })} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 block mb-1.5">PAN</label>
                                                <Input value={companyForm.billingInfo.pan} onChange={(e) => setCompanyForm({ ...companyForm, billingInfo: { ...companyForm.billingInfo, pan: e.target.value } })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Business Address</label>
                                            <Input value={companyForm.address.line1} onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, line1: e.target.value } })} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 block mb-1.5">City</label>
                                                <Input value={companyForm.address.city} onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, city: e.target.value } })} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 block mb-1.5">State</label>
                                                <Input value={companyForm.address.state} onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, state: e.target.value } })} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 block mb-1.5">Pincode</label>
                                                <Input value={companyForm.address.postalCode} onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, postalCode: e.target.value } })} />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex justify-end">
                                            <Button onClick={handleCompanySave} isLoading={updateCompany.isPending}>Save Changes</Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Placeholder for other tabs */}
                    {!['profile', 'company'].includes(activeTab) && (
                        <Card>
                            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-[var(--bg-tertary)] flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">Settings Section</h3>
                                <p className="text-[var(--text-muted)] max-w-sm mt-2">
                                    This section is under development. Functionality will be available soon.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
