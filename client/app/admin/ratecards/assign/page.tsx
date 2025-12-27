"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/core/Card';
import { Button } from '@/components/ui/core/Button';
import { Input } from '@/components/ui/core/Input';
import { Badge } from '@/components/ui/core/Badge';
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
    Users
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/components/ui/feedback/Toast';

// Mock sellers for assignment
const mockSellers = [
    { id: 'SEL-001', name: 'TechGadgets Inc.', city: 'Mumbai', assignedCards: 2 },
    { id: 'SEL-002', name: 'Fashion Hub', city: 'Delhi', assignedCards: 1 },
    { id: 'SEL-003', name: 'HomeDecor Plus', city: 'Bangalore', assignedCards: 3 },
    { id: 'SEL-004', name: 'Electronics World', city: 'Chennai', assignedCards: 0 },
    { id: 'SEL-005', name: 'Sports Zone', city: 'Pune', assignedCards: 2 },
];

// Mock rate cards
const mockRateCards = [
    { id: 'RC-001', name: 'Standard Surface', courier: 'Delhivery', type: 'B2C', isActive: true },
    { id: 'RC-002', name: 'Express Air', courier: 'Bluedart', type: 'B2C', isActive: true },
    { id: 'RC-003', name: 'Economy Ground', courier: 'DTDC', type: 'B2C', isActive: true },
    { id: 'RC-004', name: 'Premium Express', courier: 'Xpressbees', type: 'B2C', isActive: true },
    { id: 'RC-005', name: 'B2B Heavy', courier: 'Delhivery', type: 'B2B', isActive: false },
];

// Mock current assignments
const mockAssignments = [
    { sellerId: 'SEL-001', rateCardIds: ['RC-001', 'RC-002'] },
    { sellerId: 'SEL-002', rateCardIds: ['RC-003'] },
    { sellerId: 'SEL-003', rateCardIds: ['RC-001', 'RC-002', 'RC-004'] },
    { sellerId: 'SEL-005', rateCardIds: ['RC-002', 'RC-003'] },
];

export default function RateCardAssignmentPage() {
    const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
    const [searchSeller, setSearchSeller] = useState('');
    const [searchCard, setSearchCard] = useState('');
    const [assignments, setAssignments] = useState(mockAssignments);
    const { addToast } = useToast();

    const filteredSellers = mockSellers.filter(s =>
        s.name.toLowerCase().includes(searchSeller.toLowerCase()) ||
        s.city.toLowerCase().includes(searchSeller.toLowerCase())
    );

    const filteredCards = mockRateCards.filter(c =>
        c.name.toLowerCase().includes(searchCard.toLowerCase()) ||
        c.courier.toLowerCase().includes(searchCard.toLowerCase())
    );

    const getSellerAssignments = (sellerId: string) => {
        const assignment = assignments.find(a => a.sellerId === sellerId);
        return assignment?.rateCardIds || [];
    };

    const isCardAssigned = (sellerId: string, cardId: string) => {
        return getSellerAssignments(sellerId).includes(cardId);
    };

    const toggleCardAssignment = (cardId: string) => {
        if (!selectedSeller) return;

        setAssignments(prev => {
            const existing = prev.find(a => a.sellerId === selectedSeller);
            if (existing) {
                if (existing.rateCardIds.includes(cardId)) {
                    // Remove
                    return prev.map(a =>
                        a.sellerId === selectedSeller
                            ? { ...a, rateCardIds: a.rateCardIds.filter(id => id !== cardId) }
                            : a
                    );
                } else {
                    // Add
                    return prev.map(a =>
                        a.sellerId === selectedSeller
                            ? { ...a, rateCardIds: [...a.rateCardIds, cardId] }
                            : a
                    );
                }
            } else {
                // Create new assignment
                return [...prev, { sellerId: selectedSeller, rateCardIds: [cardId] }];
            }
        });
        addToast('Assignment updated', 'success');
    };

    const selectedSellerData = mockSellers.find(s => s.id === selectedSeller);

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
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockRateCards.length}</p>
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
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockSellers.length}</p>
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
                                <p className="text-sm text-[var(--text-muted)]">Unassigned Sellers</p>
                                <p className="text-2xl font-bold text-amber-600">
                                    {mockSellers.filter(s => !assignments.find(a => a.sellerId === s.id)).length}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
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
                            {filteredSellers.map((seller) => {
                                const assignedCount = getSellerAssignments(seller.id).length;
                                return (
                                    <div
                                        key={seller.id}
                                        onClick={() => setSelectedSeller(seller.id)}
                                        className={cn(
                                            "p-4 rounded-xl border cursor-pointer transition-all",
                                            selectedSeller === seller.id
                                                ? "border-[#2525FF] bg-[#2525FF]/5 ring-2 ring-[#2525FF]/20"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold text-[var(--text-primary)]">{seller.name}</h4>
                                                <p className="text-sm text-[var(--text-muted)]">{seller.city}</p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={assignedCount > 0 ? 'success' : 'warning'}>
                                                    {assignedCount} cards
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
                                    {filteredCards.map((card) => {
                                        const isAssigned = isCardAssigned(selectedSeller, card.id);
                                        return (
                                            <div
                                                key={card.id}
                                                onClick={() => toggleCardAssignment(card.id)}
                                                className={cn(
                                                    "p-4 rounded-xl border cursor-pointer transition-all",
                                                    isAssigned
                                                        ? "border-emerald-300 bg-emerald-50"
                                                        : "border-gray-200 hover:border-gray-300"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                                            isAssigned
                                                                ? "border-emerald-500 bg-emerald-500"
                                                                : "border-gray-300"
                                                        )}>
                                                            {isAssigned && <CheckCircle className="h-3 w-3 text-white" />}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-[var(--text-primary)]">{card.name}</h4>
                                                            <p className="text-sm text-[var(--text-muted)]">{card.courier} • {card.type}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant={card.isActive ? 'success' : 'neutral'}>
                                                        {card.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center">
                                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
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
