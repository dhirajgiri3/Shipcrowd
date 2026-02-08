"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { CreditCard, Check, Info, Lock, Zap, Tag } from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/core';
import { useAdminRateCards, AdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';

interface RateCardSettingsProps {
    companyId: string;
    currentRateCardId?: string;
}

export function RateCardSettings({ companyId, currentRateCardId }: RateCardSettingsProps) {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [selectedRateCardId, setSelectedRateCardId] = useState<string>(currentRateCardId || '');

    const { data: rateCardsResponse, isLoading: loadingRateCards } = useAdminRateCards({
        companyId,
        status: 'active',
        limit: 200,
    });

    const rateCards: AdminRateCard[] = rateCardsResponse?.rateCards || [];

    const { mutate: assignRateCard, isPending: isAssigning } = useMutation({
        mutationFn: async (rateCardId: string) => {
            const response = await apiClient.post(`/companies/${companyId}/assign-ratecard`, {
                rateCardId
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company', companyId] });
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

        if (selectedRateCardId === currentRateCardId) {
            addToast('This rate card is already assigned', 'info');
            return;
        }

        assignRateCard(selectedRateCardId);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-indigo-600" />
                    Rate Card Assignment
                </CardTitle>
                <CardDescription>
                    Assign a rate card to control pricing for this company's shipments
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {currentRateCardId && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-indigo-900">Currently Assigned</p>
                                <p className="text-xs text-indigo-700 mt-1">
                                    {rateCards.find(rc => rc._id === currentRateCardId)?.name || 'Unknown Rate Card'}
                                </p>
                            </div>
                            <Badge variant="success" className="flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Active
                            </Badge>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                        Select Rate Card
                    </label>

                    {loadingRateCards ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {rateCards.map((rateCard) => (
                                <div
                                    key={rateCard._id}
                                    className={`
                                        border rounded-lg p-4 cursor-pointer transition-all
                                        ${selectedRateCardId === rateCard._id
                                            ? 'border-indigo-600 bg-indigo-50'
                                            : 'border-gray-200 hover:border-indigo-300'
                                        }
                                    `}
                                    onClick={() => setSelectedRateCardId(rateCard._id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-gray-900">
                                                    {rateCard.name}
                                                </h4>
                                                {currentRateCardId === rateCard._id && (
                                                    <Badge variant="success" size="sm">Current</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {rateCard.baseRates?.length || 0} base rates configured
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                {rateCard.version && (
                                                    <Badge variant="outline" className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Tag className="h-3 w-3" /> {rateCard.version}
                                                    </Badge>
                                                )}
                                                {rateCard.fuelSurcharge ? (
                                                    <Badge variant="warning" className="text-xs flex items-center gap-1">
                                                        <Zap className="h-3 w-3" /> Fuel: {rateCard.fuelSurcharge}%
                                                    </Badge>
                                                ) : null}
                                                {rateCard.minimumCall ? (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Min: ₹{rateCard.minimumCall}
                                                    </Badge>
                                                ) : null}
                                                {rateCard.isLocked && (
                                                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                                        <Lock className="h-3 w-3" /> Locked
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            {selectedRateCardId === rateCard._id && (
                                                <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                                    <Check className="h-3 w-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {rateCards.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No active rate cards available</p>
                                    <p className="text-xs mt-1">Create a rate card first to assign it</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button
                        onClick={handleAssign}
                        disabled={isAssigning || !selectedRateCardId || selectedRateCardId === currentRateCardId}
                    >
                        {isAssigning ? 'Assigning...' : 'Assign Rate Card'}
                    </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700">
                            Changing the rate card will affect all future shipments. Existing shipments will retain their original pricing.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
