'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { earlyCodApi } from '@/src/core/api/clients/finance/earlyCodApi';
import { Card } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { Loader2, CheckCircle, XCircle, Zap, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function EarlyCODPage() {
    const queryClient = useQueryClient();

    // 1. Get Current Enrollment
    const { data: enrollment, isLoading: enrollLoading } = useQuery({
        queryKey: ['early-cod-enrollment'],
        queryFn: () => earlyCodApi.getEnrollment()
    });

    // 2. Check Eligibility (only if not enrolled)
    const { data: eligibility, isLoading: eligLoading } = useQuery({
        queryKey: ['early-cod-eligibility'],
        queryFn: () => earlyCodApi.checkEligibility(),
        enabled: !enrollLoading && !enrollment // Don't check if already enrolled
    });

    const enrollMutation = useMutation({
        mutationFn: (tier: string) => earlyCodApi.enroll(tier),
        onSuccess: () => {
            toast.success('Successfully enrolled in Early COD!');
            queryClient.invalidateQueries({ queryKey: ['early-cod-enrollment'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to enroll');
        }
    });

    const createBatchMutation = useMutation({
        mutationFn: () => earlyCodApi.createBatch(),
        onSuccess: (data) => {
            toast.success(`Batch created! Fee: ₹${data.fee}`);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create batch');
        }
    });

    if (enrollLoading || eligLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // SECTION 1: Already Enrolled View
    if (enrollment) {
        return (
            <div className="space-y-8 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Early COD Program</h1>
                        <p className="text-muted-foreground">Manage your accelerated remittance plan</p>
                    </div>
                    <Badge variant="success" className="text-lg px-4 py-1">
                        Active: {enrollment.tier} Plan
                    </Badge>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Zap className="h-6 w-6 text-yellow-500" />
                            <h3 className="text-lg font-bold">Program Status</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Current Tier</p>
                                <p className="text-xl font-bold">{enrollment.tier}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Fee Rate</p>
                                <p className="text-xl font-bold">{(enrollment.fee * 100).toFixed(1)}%</p>
                            </div>
                        </div>
                        <Button
                            className="w-full mt-4"
                            onClick={() => createBatchMutation.mutate()}
                            disabled={createBatchMutation.isPending}
                        >
                            {createBatchMutation.isPending ? 'Processing...' : 'Request Early Payout Now'}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Triggering manual payout will create a batch for all eligible delivered shipments.
                        </p>
                    </Card>

                    <Card className="p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6 text-blue-500" />
                            <h3 className="text-lg font-bold">Usage Statistics</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Remitted Early</span>
                                <span className="font-mono font-bold">₹{enrollment.usage?.totalAmountRemitted || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Fees Paid</span>
                                <span className="font-mono font-bold text-red-500">-₹{enrollment.usage?.totalFeesPaid || 0}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // SECTION 2: Not Enrolled - Eligibility & Signup
    return (
        <div className="space-y-8 p-6">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold tracking-tight">Get Paid Faster with Early COD</h1>
                <p className="text-lg text-muted-foreground">
                    Unlock capital trapped in transit. Improve your cash flow with T+1 or T+2 remittance cycles.
                </p>
            </div>

            {/* Eligibility Status */}
            <Card className={`max-w-3xl mx-auto p-6 border-l-4 ${eligibility?.qualified ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <div className="flex items-start gap-4">
                    {eligibility?.qualified ? (
                        <CheckCircle className="h-8 w-8 text-green-500 mt-1" />
                    ) : (
                        <XCircle className="h-8 w-8 text-red-500 mt-1" />
                    )}
                    <div>
                        <h3 className="text-xl font-bold">
                            {eligibility?.qualified ? 'You are eligible!' : 'Not yet eligible'}
                        </h3>
                        <p className="text-muted-foreground mt-1">
                            {eligibility?.qualified
                                ? 'Based on your robust shipping performance, you qualify for our Early COD program.'
                                : 'Please improve your performance metrics to qualify.'}
                        </p>

                        {!eligibility?.qualified && eligibility?.reasons && (
                            <ul className="mt-4 list-disc pl-5 text-sm text-red-600">
                                {eligibility.reasons.map((r: string, i: number) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </Card>

            {/* Tiers */}
            {eligibility?.qualified && (
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-8">
                    {/* T+1 Plan */}
                    <Card className="p-6 relative overflow-hidden border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => enrollMutation.mutate('T+1')}>
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold">FASTEST</div>
                        <h3 className="text-xl font-bold mb-2">T+1 Plan</h3>
                        <div className="text-3xl font-bold mb-4">3% <span className="text-sm font-normal text-muted-foreground">fee</span></div>
                        <p className="text-sm text-muted-foreground mb-6">Remittance processed 1 day after delivery.</p>
                        <ul className="space-y-2 text-sm mb-6">
                            <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Next day settlement</li>
                            <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Improved cash flow</li>
                        </ul>
                        <Button className="w-full" disabled={enrollMutation.isPending}>
                            {enrollMutation.isPending ? 'Enrolling...' : 'Select T+1'}
                        </Button>
                    </Card>

                    {/* T+2 Plan */}
                    <Card className="p-6 border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => enrollMutation.mutate('T+2')}>
                        <h3 className="text-xl font-bold mb-2">T+2 Plan</h3>
                        <div className="text-3xl font-bold mb-4">2% <span className="text-sm font-normal text-muted-foreground">fee</span></div>
                        <p className="text-sm text-muted-foreground mb-6">Remittance processed 2 days after delivery.</p>
                        <ul className="space-y-2 text-sm mb-6">
                            <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Faster than standard</li>
                            <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Lower fee</li>
                        </ul>
                        <Button className="w-full" variant="outline" disabled={enrollMutation.isPending}>
                            {enrollMutation.isPending ? 'Enrolling...' : 'Select T+2'}
                        </Button>
                    </Card>

                    {/* Standard (Comparison) */}
                    <Card className="p-6 bg-muted/50 opacity-75">
                        <h3 className="text-xl font-bold mb-2 text-muted-foreground">Standard</h3>
                        <div className="text-3xl font-bold mb-4 text-muted-foreground">0% <span className="text-sm font-normal">fee</span></div>
                        <p className="text-sm text-muted-foreground mb-6">Standard T+3 settlement cycle.</p>
                        <ul className="space-y-2 text-sm mb-6 text-muted-foreground">
                            <li className="flex gap-2"><CheckCircle className="h-4 w-4" /> No extra fees</li>
                            <li className="flex gap-2"><CheckCircle className="h-4 w-4" /> Standard processing</li>
                        </ul>
                        <Button className="w-full" variant="ghost" disabled>Included</Button>
                    </Card>
                </div>
            )}
        </div>
    );
}
