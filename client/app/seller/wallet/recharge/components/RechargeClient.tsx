"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import Script from 'next/script';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import {
    Wallet,
    CreditCard,
    Building2,
    QrCode,
    CheckCircle,
    ArrowRight,
    IndianRupee,
    Gift,
    Zap,
    Shield
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/lib/utils';
import Link from 'next/link';
import { TruckLoader } from '@/src/components/ui';

// API Hooks
import { useInitWalletRecharge, useWalletBalance, useRechargeWallet } from '@/src/core/api/hooks/finance/useWallet';
import { useProfile } from '@/src/core/api/hooks/settings/useProfile';
import { useValidatePromoCode } from '@/src/core/api/hooks/marketing/usePromoCodes';

const quickAmounts = [1000, 2000, 5000, 10000, 25000, 50000];

const paymentMethods = [
    { id: 'upi', name: 'UPI', description: 'GPay, PhonePe, Paytm', icon: QrCode },
    { id: 'card', name: 'Credit/Debit Card', description: 'Visa, Mastercard, RuPay', icon: CreditCard },
    { id: 'netbanking', name: 'Net Banking', description: 'All major banks', icon: Building2 },
];

interface AppliedPromo {
    code: string;
    bonusCredit: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
}

export function RechargeClient() {
    const [amount, setAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('upi');
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
    const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);

    // API Hooks
    const { data: balanceData } = useWalletBalance();
    const initRecharge = useInitWalletRecharge();
    const { mutate: rechargeWallet, isPending: isRecharging } = useRechargeWallet();
    const validatePromo = useValidatePromoCode();
    const { data: profile } = useProfile();
    const { addToast } = useToast();

    const currentBalance = balanceData?.balance || 0;
    const rechargeAmount = Number(amount) || 0;
    const promoCredit = appliedPromo?.bonusCredit || 0;
    const totalWalletCredit = rechargeAmount + promoCredit;

    const handleQuickAmount = (value: number) => {
        if (appliedPromo && value !== rechargeAmount) {
            setAppliedPromo(null);
        }
        setAmount(value.toString());
    };

    const handleApplyPromo = async () => {
        if (rechargeAmount < 100) {
            addToast('Enter recharge amount first (minimum ₹100)', 'warning');
            return;
        }

        if (!promoCode.trim()) {
            addToast('Please enter a promo code', 'warning');
            return;
        }

        try {
            const result = await validatePromo.mutateAsync({
                code: promoCode.trim(),
                orderAmount: rechargeAmount,
            });

            if (!result.valid) {
                addToast(result.message || 'Promo code is not valid', 'warning');
                setAppliedPromo(null);
                return;
            }

            setAppliedPromo({
                code: result.code || promoCode.trim().toUpperCase(),
                bonusCredit: result.discountAmount || 0,
                discountType: result.discountType,
                discountValue: result.discountValue,
            });
            addToast(`Promo applied: ${formatCurrency(result.discountAmount || 0)} bonus credit`, 'success');
        } catch (error) {
            setAppliedPromo(null);
            addToast('Invalid or expired promo code', 'error');
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoCode('');
    };

    const handleProceed = async () => {
        if (!amount || rechargeAmount < 100) {
            addToast('Minimum recharge amount is ₹100', 'warning');
            return;
        }

        if (!isRazorpayLoaded) {
            addToast('Payment gateway failed to load. Please refresh.', 'error');
            return;
        }

        try {
            const init = await initRecharge.mutateAsync({
                amount: rechargeAmount,
                promoCode: appliedPromo?.code,
            });
            if (!(init.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)) {
                addToast('Razorpay key is not configured. Please contact support.', 'error');
                return;
            }

            // Initialize Razorpay Options
            const options: RazorpayOptions = {
                key: init.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
                amount: init.amount * 100, // Amount in paise
                currency: init.currency || "INR",
                name: "Shipcrowd Logistics",
                description: "Wallet Recharge",
                image: "https://shipcrowd.com/logo.png",
                order_id: init.orderId,
                handler: function (response: any) {
                    // On success, verify/credit on backend
                    rechargeWallet(
                        {
                            amount: init.amount,
                            paymentId: response.razorpay_payment_id,
                            orderId: response.razorpay_order_id,
                            signature: response.razorpay_signature,
                        },
                        {
                            onSuccess: () => {
                                setAmount('');
                                setAppliedPromo(null);
                                setPromoCode('');
                            }
                        }
                    );
                },
                prefill: {
                    name: profile?.name || "",
                    email: profile?.email || "",
                    contact: profile?.phone || ""
                },
                theme: {
                    color: "#2563EB"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();
        } catch (error) {
            console.error('Failed to initialize wallet recharge:', error);
            addToast('Unable to start payment. Please try again.', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => setIsRazorpayLoaded(true)}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-[var(--primary-blue)]" />
                        Wallet Recharge
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Add funds to your wallet for shipping
                    </p>
                </div>
                <Link href="/seller/wallet">
                    <Button variant="outline">View Transactions</Button>
                </Link>
            </div>

            {/* Current Balance Card */}
            <Card className="bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/70 text-sm">Current Balance</p>
                            <p className="text-4xl font-bold mt-1">{formatCurrency(currentBalance)}</p>
                            <p className="text-white/60 text-sm mt-2 flex items-center gap-1">
                                <Shield className="h-3.5 w-3.5" />
                                Secured wallet by RBI guidelines
                            </p>
                        </div>
                        <div className="h-16 w-16 rounded-2xl bg-[var(--bg-primary)]/10 flex items-center justify-center">
                            <Wallet className="h-8 w-8" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recharge Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Amount Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <IndianRupee className="h-5 w-5 text-[var(--primary-blue)]" />
                                Enter Amount
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[var(--text-muted)]">₹</span>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        if (appliedPromo && Number(nextValue || 0) !== rechargeAmount) {
                                            setAppliedPromo(null);
                                        }
                                        setAmount(nextValue);
                                    }}
                                    placeholder="Enter amount"
                                    className="pl-10 h-14 text-2xl font-bold"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {quickAmounts.map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => handleQuickAmount(value)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                                            amount === value.toString()
                                                ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]"
                                                : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                                        )}
                                    >
                                        {formatCurrency(value)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">Minimum recharge: ₹100</p>
                        </CardContent>
                    </Card>

                    {/* Payment Method */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-[var(--primary-blue)]" />
                                Payment Method
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {paymentMethods.map((method) => (
                                <div
                                    key={method.id}
                                    onClick={() => setSelectedMethod(method.id)}
                                    className={cn(
                                        "p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4",
                                        selectedMethod === method.id
                                            ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)] ring-2 ring-[var(--primary-blue)]/20"
                                            : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                                    )}
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-lg flex items-center justify-center",
                                        selectedMethod === method.id ? "bg-[var(--primary-blue-soft)]" : "bg-[var(--bg-secondary)]"
                                    )}>
                                        <method.icon className={cn(
                                            "h-5 w-5",
                                            selectedMethod === method.id ? "text-[var(--primary-blue)]" : "text-[var(--text-muted)]"
                                        )} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-[var(--text-primary)]">{method.name}</p>
                                        <p className="text-sm text-[var(--text-muted)]">{method.description}</p>
                                    </div>
                                    <div className={cn(
                                        "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                        selectedMethod === method.id
                                            ? "border-[var(--primary-blue)] bg-[var(--primary-blue)]"
                                            : "border-[var(--border-subtle)]"
                                    )}>
                                        {selectedMethod === method.id && (
                                            <CheckCircle className="h-3 w-3 text-white" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Promo Code */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Gift className="h-5 w-5 text-[var(--primary-blue)]" />
                                Apply Promo Code
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {appliedPromo ? (
                                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--success-bg)] border border-[var(--success)]/20">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                                        <div>
                                            <p className="font-semibold text-[var(--success)]">{appliedPromo.code}</p>
                                            <p className="text-sm text-[var(--success)]">
                                                Bonus wallet credit: {formatCurrency(appliedPromo.bonusCredit)}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={handleRemovePromo}>
                                        Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter promo code"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button variant="outline" onClick={handleApplyPromo}>
                                        Apply
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-lg">Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">You Pay</span>
                                    <span className="font-medium">{amount ? formatCurrency(rechargeAmount) : '₹0'}</span>
                                </div>
                                {appliedPromo && (
                                    <div className="flex justify-between text-sm text-[var(--success)]">
                                        <span>Promo Bonus ({appliedPromo.code})</span>
                                        <span>+{formatCurrency(appliedPromo.bonusCredit)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-[var(--text-secondary)]">Total Wallet Credit</span>
                                    <span>{formatCurrency(totalWalletCredit)}</span>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total Pay</span>
                                    <span>{formatCurrency(rechargeAmount)}</span>
                                </div>
                            </div>

                            <Button
                                className="w-full h-12"
                                onClick={handleProceed}
                                isLoading={isRecharging}
                                disabled={!amount || Number(amount) < 100 || isRecharging}
                            >
                                <Zap className="h-4 w-4 mr-2" />
                                {isRecharging ? 'Processing...' : 'Proceed to Pay'}
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>

                            <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                                <Shield className="h-3.5 w-3.5" />
                                100% Secure Payment
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* Truck Loader Overlay */}
            {isRecharging && (
                <TruckLoader
                    message="Verifying Payment..."
                    subMessage="Updating your wallet balance"
                    fullScreen={true}
                />
            )}
        </div>
    );
}
