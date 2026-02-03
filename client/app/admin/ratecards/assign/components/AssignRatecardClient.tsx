"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    CreditCard,
    Search,
    Building2,
    Plus,
    Trash2,
    CheckCircle,
    AlertTriangle,
    ArrowRight,
    X,
    Users,
    Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useRateCardAssignments, useAssignRateCard, useUnassignRateCard } from '@/src/core/api/hooks/admin/useRateCardManagement';
import { useAdminCompanies } from '@/src/core/api/hooks/admin/companies/useCompanies';
import { useRateCards } from '@/src/core/api/hooks/logistics/useRateCards';

export function AssignRatecardClient() {
    const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
    const [searchSeller, setSearchSeller] = useState('');
    const [searchCard, setSearchCard] = useState('');
    const { addToast } = useToast();

    // API Hooks
    const { data: sellersData, isLoading: isLoadingSellers } = useAdminCompanies({ limit: 100 });
    const { data: assignmentsData, isLoading: isLoadingAssignments } = useRateCardAssignments();
    const { data: rateCardsData, isLoading: isLoadingRateCards } = useRateCards();
    const { mutate: assignCard, isPending: isAssigning } = useAssignRateCard();
    const { mutate: unassignCard, isPending: isUnassigning } = useUnassignRateCard();

    const sellers = sellersData?.companies || [];
    const assignments = assignmentsData?.assignments || [];
    const rateCards = rateCardsData || [];

    const filteredSellers = sellers.filter(s =>
        s.name.toLowerCase().includes(searchSeller.toLowerCase())
    );

    const filteredCards = rateCards.filter(c =>
        c.name.toLowerCase().includes(searchCard.toLowerCase())
    );

    const getSellerAssignments = (sellerId: string) => {
        return assignments
            .filter(a => a.sellerId === sellerId && a.isActive)
            .map(a => a.rateCardId);
    };

    const isCardAssigned = (sellerId: string, cardId: string) => {
        return getSellerAssignments(sellerId).includes(cardId);
    };

    const toggleCardAssignment = (cardId: string) => {
        if (!selectedSeller) return;

        const isAssigned = isCardAssigned(selectedSeller, cardId);

        if (isAssigned) {
            // Find the assignment to unassign
            const assignment = assignments.find(
                a => a.sellerId === selectedSeller && a.rateCardId === cardId && a.isActive
            );
            if (assignment) {
                unassignCard(assignment.id);
            }
        } else {
            // Assign the card
            assignCard({
                rateCardId: cardId,
                sellerId: selectedSeller,
                priority: 1
            });
        }
    };

    const selectedSellerData = sellers.find(s => s._id === selectedSeller);

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
                        Assign rate cards to sellers for shipping calculations
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total Rate Cards</p>
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
                                <p className="text-sm text-[var(--text-muted)]">Total Sellers</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {isLoadingSellers ? <Loader2 className="h-6 w-6 animate-spin" /> : sellers.length}
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
                                <p className="text-sm text-[var(--text-muted)]">Active Assignments</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {isLoadingAssignments ? <Loader2 className="h-6 w-6 animate-spin" /> : assignments.filter(a => a.isActive).length}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Seller Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[#2525FF]" />
                            Select Seller
                        </CardTitle>
                        <CardDescription>Choose a seller to manage their rate card assignments</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            placeholder="Search sellers..."
                            value={searchSeller}
                            onChange={(e) => setSearchSeller(e.target.value)}
                            icon={<Search className="h-4 w-4" />}
                        />
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {isLoadingSellers ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                                </div>
                            ) : filteredSellers.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-[var(--text-muted)]">No sellers found</p>
                                </div>
                            ) : (
                                filteredSellers.map((seller) => {
                                    const assignedCount = getSellerAssignments(seller._id).length;
                                    return (
                                        <div
                                            key={seller._id}
                                            onClick={() => setSelectedSeller(seller._id)}
                                            className={cn(
                                                "p-4 rounded-xl border cursor-pointer transition-all",
                                                selectedSeller === seller._id
                                                    ? "border-[#2525FF] bg-[#2525FF]/5 ring-2 ring-[#2525FF]/20"
                                                    : "border-[var(--border-default)] hover:border-[var(--border-focus)]"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-[var(--text-primary)]">{seller.name}</h4>
                                                    <p className="text-sm text-[var(--text-muted)]">{seller.address.city}, {seller.address.state}</p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={assignedCount > 0 ? 'success' : 'warning'}>
                                                        {assignedCount} cards
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Rate Card Assignment */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-[#2525FF]" />
                            Assign Rate Cards
                            {selectedSellerData && (
                                <Badge variant="outline" className="ml-2 font-normal">
                                    {selectedSellerData.name}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {selectedSeller
                                ? 'Click to toggle rate card assignment'
                                : 'Select a seller first'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedSeller ? (
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
                                            const isAssigned = isCardAssigned(selectedSeller, card._id);
                                            const isProcessing = isAssigning || isUnassigning;
                                            return (
                                                <div
                                                    key={card._id}
                                                    onClick={() => !isProcessing && toggleCardAssignment(card._id)}
                                                    className={cn(
                                                        "p-4 rounded-xl border transition-all",
                                                        isProcessing ? "cursor-wait opacity-50" : "cursor-pointer",
                                                        isAssigned
                                                            ? "border-emerald-300 bg-emerald-50"
                                                            : "border-[var(--border-default)] hover:border-[var(--border-focus)]"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                                                isAssigned
                                                                    ? "border-emerald-500 bg-emerald-500"
                                                                    : "border-[var(--border-focus)]"
                                                            )}>
                                                                {isAssigned && <CheckCircle className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-[var(--text-primary)]">{card.name}</h4>
                                                                <p className="text-sm text-[var(--text-muted)]">Rate Card ID: {card._id}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center">
                                <Building2 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">No Seller Selected</h3>
                                <p className="text-[var(--text-muted)] mt-1">Select a seller from the left to manage assignments</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
