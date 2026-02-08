"use client";
export const dynamic = "force-dynamic";

import { useMemo, useState } from 'react';
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
import { useCompanyGroups, useCreateCompanyGroup } from '@/src/core/api/hooks/admin/useCompanyGroups';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';

export function AssignRatecardClient() {
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [selectedRateCardId, setSelectedRateCardId] = useState<string>('');
    const [searchCompany, setSearchCompany] = useState('');
    const [searchCard, setSearchCard] = useState('');
    const [searchGroup, setSearchGroup] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const { data: companiesData, isLoading: isLoadingCompanies } = useAdminCompanies({ limit: 200 });
    const companies = companiesData?.companies || [];

    const { data: groupsData, isLoading: isLoadingGroups } = useCompanyGroups({ limit: 200 });
    const groups = groupsData?.groups || [];

    const { data: rateCardsData, isLoading: isLoadingRateCards } = useAdminRateCards(
        { limit: 200 },
        { enabled: true }
    );
    const rateCards = rateCardsData?.rateCards || [];

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchCompany.toLowerCase())
    );

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchGroup.toLowerCase())
    );

    const filteredCards = rateCards.filter(card =>
        card.name.toLowerCase().includes(searchCard.toLowerCase())
    );

    const selectedRateCard = useMemo(
        () => rateCards.find(card => card._id === selectedRateCardId) || null,
        [rateCards, selectedRateCardId]
    );

    const toggleCompanySelection = (companyId: string) => {
        setSelectedCompanyIds((prev) => (
            prev.includes(companyId) ? prev.filter(id => id !== companyId) : [...prev, companyId]
        ));
    };

    const toggleGroupSelection = (groupId: string) => {
        setSelectedGroupIds((prev) => (
            prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
        ));
    };

    const { mutate: assignRateCard, isPending: isAssigning } = useMutation({
        mutationFn: async () => {
            if ((selectedCompanyIds.length === 0 && selectedGroupIds.length === 0) || !selectedRateCardId) return;
            const response = await apiClient.post('/admin/ratecards/bulk-assign', {
                rateCardId: selectedRateCardId,
                companyIds: selectedCompanyIds,
                groupIds: selectedGroupIds
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
        if (!selectedRateCardId) {
            addToast('Please select a rate card', 'error');
            return;
        }
        if (selectedCompanyIds.length === 0 && selectedGroupIds.length === 0) {
            addToast('Please select at least one company or group', 'error');
            return;
        }
        assignRateCard();
    };

    const { mutate: createGroup, isPending: isCreatingGroup } = useCreateCompanyGroup({
        onSuccess: () => {
            setNewGroupName('');
            addToast('Group created successfully!', 'success');
        },
        onError: (error: any) => {
            addToast(error?.response?.data?.message || 'Failed to create group', 'error');
        }
    });

    const handleCreateGroup = () => {
        if (!newGroupName.trim()) {
            addToast('Please provide a group name', 'error');
            return;
        }
        if (selectedCompanyIds.length === 0) {
            addToast('Select at least one company to create a group', 'error');
            return;
        }
        createGroup({ name: newGroupName.trim(), companyIds: selectedCompanyIds });
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
                                <p className="text-sm text-[var(--text-muted)]">Selected Companies</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {selectedCompanyIds.length + selectedGroupIds.length > 0
                                        ? selectedCompanyIds.length + selectedGroupIds.length
                                        : '—'}
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
                {/* Rate Card Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-[#2525FF]" />
                            Select Rate Card
                            {selectedRateCard && (
                                <Badge variant="outline" className="ml-2 font-normal">
                                    {selectedRateCard.name}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>Choose the rate card you want to assign</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                    const cardCompany = typeof card.companyId === 'string' ? null : card.companyId;
                                    const scopeLabel = card.scope === 'global' || !cardCompany ? 'Global' : 'Company';
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
                                            <div className="flex items-center justify-between gap-3">
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
                                                        <p className="text-sm text-[var(--text-muted)]">
                                                            {scopeLabel}
                                                            {cardCompany ? ` · ${cardCompany.name}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary">{scopeLabel}</Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Company Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[#2525FF]" />
                            Select Companies
                        </CardTitle>
                        <CardDescription>Assign the selected rate card to one or more companies</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Company Groups</p>
                                <Badge variant="secondary">{selectedGroupIds.length} selected</Badge>
                            </div>
                            <Input
                                placeholder="Search groups..."
                                value={searchGroup}
                                onChange={(e) => setSearchGroup(e.target.value)}
                                icon={<Search className="h-4 w-4" />}
                            />
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {isLoadingGroups ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary-blue)]" />
                                    </div>
                                ) : filteredGroups.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-[var(--text-muted)] text-sm">No groups found</p>
                                    </div>
                                ) : (
                                    filteredGroups.map((group) => {
                                        const isSelected = selectedGroupIds.includes(group._id);
                                        return (
                                            <div
                                                key={group._id}
                                                onClick={() => toggleGroupSelection(group._id)}
                                                className={cn(
                                                    "p-3 rounded-xl border cursor-pointer transition-all",
                                                    isSelected
                                                        ? "border-[#2525FF] bg-[#2525FF]/5 ring-2 ring-[#2525FF]/20"
                                                        : "border-[var(--border-default)] hover:border-[var(--border-focus)]"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                                            isSelected
                                                                ? "border-[#2525FF] bg-[#2525FF]"
                                                                : "border-[var(--border-focus)]"
                                                        )}>
                                                            {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-[var(--text-primary)]">{group.name}</h4>
                                                            <p className="text-xs text-[var(--text-muted)]">
                                                                {(group.companyIds || []).length} companies
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="New group name"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleCreateGroup}
                                    disabled={isCreatingGroup || selectedCompanyIds.length === 0}
                                >
                                    {isCreatingGroup ? 'Saving...' : 'Save Group'}
                                </Button>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">
                                Create a group from the currently selected companies.
                            </p>
                        </div>

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
                                filteredCompanies.map((company) => {
                                    const isSelected = selectedCompanyIds.includes(company._id);
                                    return (
                                        <div
                                            key={company._id}
                                            onClick={() => toggleCompanySelection(company._id)}
                                            className={cn(
                                                "p-4 rounded-xl border cursor-pointer transition-all",
                                                isSelected
                                                    ? "border-[#2525FF] bg-[#2525FF]/5 ring-2 ring-[#2525FF]/20"
                                                    : "border-[var(--border-default)] hover:border-[var(--border-focus)]"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                                        isSelected
                                                            ? "border-[#2525FF] bg-[#2525FF]"
                                                            : "border-[var(--border-focus)]"
                                                    )}>
                                                        {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-[var(--text-primary)]">{company.name}</h4>
                                                        <p className="text-sm text-[var(--text-muted)]">{company.address?.city}, {company.address?.state}</p>
                                                    </div>
                                                </div>
                                                {company.settings?.defaultRateCardId && (
                                                    <Badge variant="success">Assigned</Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <Button
                                onClick={handleAssign}
                                disabled={isAssigning || !selectedRateCardId || (selectedCompanyIds.length === 0 && selectedGroupIds.length === 0)}
                            >
                                {isAssigning ? 'Assigning...' : 'Assign Rate Card'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
