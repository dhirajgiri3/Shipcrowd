"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    CreditCard,
    Search,
    Building2,
    CheckCircle,
    Users,
    Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useAdminCompanies } from '@/src/core/api/hooks/admin/companies/useCompanies';
import { useAdminRateCards } from '@/src/core/api/hooks/admin/useAdminRateCards';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';

export function AssignRatecardClient() {
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [selectedRateCardId, setSelectedRateCardId] = useState<string>('');
    const [searchCompany, setSearchCompany] = useState('');
    const [searchCard, setSearchCard] = useState('');
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const { data: companiesData, isLoading: isLoadingCompanies } = useAdminCompanies({ limit: 200 });
    const companies = companiesData?.companies || [];

    const { data: rateCardsData, isLoading: isLoadingRateCards } = useAdminRateCards(
        selectedCompanyId ? { companyId: selectedCompanyId, limit: 200 } : undefined,
        { enabled: !!selectedCompanyId }
    );
    const rateCards = rateCardsData?.rateCards || [];

    const selectedCompany = useMemo(
        () => companies.find(company => company._id === selectedCompanyId) || null,
        [companies, selectedCompanyId]
    );

    useEffect(() => {
        if (!selectedCompany) {
            setSelectedRateCardId('');
            return;
        }
        setSelectedRateCardId(selectedCompany.settings?.defaultRateCardId || '');
    }, [selectedCompany]);

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchCompany.toLowerCase())
    );

    const filteredCards = rateCards.filter(card =>
        card.name.toLowerCase().includes(searchCard.toLowerCase())
    );

    const { mutate: assignRateCard, isPending: isAssigning } = useMutation({
        mutationFn: async () => {
            if (!selectedCompanyId || !selectedRateCardId) return;
            const response = await apiClient.post(`/companies/${selectedCompanyId}/assign-ratecard`, {
                rateCardId: selectedRateCardId
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.companies.all() });
            addToast('Rate card assigned successfully!', 'success');
        },
        onError: (error: any) => {
            addToast(error?.response?.data?.message || 'Failed to assign rate card', 'error');
        }
    });

    const handleAssign = () => {
        if (!selectedCompanyId) {
            addToast('Please select a company', 'error');
            return;
        }
        if (!selectedRateCardId) {
            addToast('Please select a rate card', 'error');
            return;
        }
        assignRateCard();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-[#2525FF]" />
                        Rate Card Assignment
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Assign default rate cards to companies for shipping calculations
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total Companies</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {isLoadingCompanies ? <Loader2 className="h-6 w-6 animate-spin" /> : companies.length}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Users className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Rate Cards</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {isLoadingRateCards ? <Loader2 className="h-6 w-6 animate-spin" /> : rateCards.length}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[#2525FF]/10 flex items-center justify-center">
                                <CreditCard className="h-5 w-5 text-[#2525FF]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Selected Company</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {selectedCompany ? selectedCompany.name : '—'}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Company Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[#2525FF]" />
                            Select Company
                        </CardTitle>
                        <CardDescription>Choose a company to manage its default rate card</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            placeholder="Search companies..."
                            value={searchCompany}
                            onChange={(e) => setSearchCompany(e.target.value)}
                            icon={<Search className="h-4 w-4" />}
                        />
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {isLoadingCompanies ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                                </div>
                            ) : filteredCompanies.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-[var(--text-muted)]">No companies found</p>
                                </div>
                            ) : (
                                filteredCompanies.map((company) => (
                                    <div
                                        key={company._id}
                                        onClick={() => setSelectedCompanyId(company._id)}
                                        className={cn(
                                            "p-4 rounded-xl border cursor-pointer transition-all",
                                            selectedCompanyId === company._id
                                                ? "border-[#2525FF] bg-[#2525FF]/5 ring-2 ring-[#2525FF]/20"
                                                : "border-[var(--border-default)] hover:border-[var(--border-focus)]"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold text-[var(--text-primary)]">{company.name}</h4>
                                                <p className="text-sm text-[var(--text-muted)]">{company.address?.city}, {company.address?.state}</p>
                                            </div>
                                            {company.settings?.defaultRateCardId && (
                                                <Badge variant="success">Assigned</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Rate Card Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-[#2525FF]" />
                            Select Rate Card
                            {selectedCompany && (
                                <Badge variant="outline" className="ml-2 font-normal">
                                    {selectedCompany.name}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {selectedCompanyId
                                ? 'Choose the default rate card for this company'
                                : 'Select a company first'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedCompanyId ? (
                            <>
                                <Input
                                    placeholder="Search rate cards..."
                                    value={searchCard}
                                    onChange={(e) => setSearchCard(e.target.value)}
                                    icon={<Search className="h-4 w-4" />}
                                />
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {isLoadingRateCards ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                                        </div>
                                    ) : filteredCards.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-[var(--text-muted)]">No rate cards available</p>
                                        </div>
                                    ) : (
                                        filteredCards.map((card) => {
                                            const isSelected = selectedRateCardId === card._id;
                                            const isCurrent = selectedCompany?.settings?.defaultRateCardId === card._id;
                                            return (
                                                <div
                                                    key={card._id}
                                                    onClick={() => setSelectedRateCardId(card._id)}
                                                    className={cn(
                                                        "p-4 rounded-xl border transition-all cursor-pointer",
                                                        isSelected
                                                            ? "border-emerald-300 bg-emerald-50"
                                                            : "border-[var(--border-default)] hover:border-[var(--border-focus)]"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                                                isSelected
                                                                    ? "border-emerald-500 bg-emerald-500"
                                                                    : "border-[var(--border-focus)]"
                                                            )}>
                                                                {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-[var(--text-primary)]">{card.name}</h4>
                                                                <p className="text-sm text-[var(--text-muted)]">Rate Card ID: {card._id}</p>
                                                            </div>
                                                        </div>
                                                        {isCurrent && <Badge variant="success">Current</Badge>}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="flex justify-end pt-4 border-t">
                                    <Button
                                        onClick={handleAssign}
                                        disabled={isAssigning || !selectedRateCardId}
                                    >
                                        {isAssigning ? 'Assigning...' : 'Assign Rate Card'}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center">
                                <Building2 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">No Company Selected</h3>
                                <p className="text-[var(--text-muted)] mt-1">Select a company from the left to manage assignments</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
