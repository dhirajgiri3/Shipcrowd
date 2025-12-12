"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    Wallet,
    Plus,
    CreditCard,
    Building2,
    QrCode,
    CheckCircle,
    ArrowRight,
    IndianRupee,
    Gift,
    Zap,
    Clock,
    Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

const quickAmounts = [1000, 2000, 5000, 10000, 25000, 50000];

const paymentMethods = [
    { id: 'upi', name: 'UPI', description: 'GPay, PhonePe, Paytm', icon: QrCode },
    { id: 'card', name: 'Credit/Debit Card', description: 'Visa, Mastercard, RuPay', icon: CreditCard },
    { id: 'netbanking', name: 'Net Banking', description: 'All major banks', icon: Building2 },
];

// Mock promo codes
const mockPromoCodes = [
    { code: 'SHIP50', discount: 50, type: 'flat', minAmount: 2000 },
    { code: 'FIRST10', discount: 10, type: 'percent', minAmount: 1000, maxDiscount: 500 },
];

export default function RechargePage() {
    const [amount, setAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('upi');
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<typeof mockPromoCodes[0] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    const currentBalance = 24500;

    const handleQuickAmount = (value: number) => {
        setAmount(value.toString());
    };

    const handleApplyPromo = () => {
        const promo = mockPromoCodes.find(p => p.code === promoCode.toUpperCase());
        if (promo) {
            if (Number(amount) >= promo.minAmount) {
                setAppliedPromo(promo);
                addToast(`Promo code applied! You'll get ${promo.type === 'flat' ? formatCurrency(promo.discount) : `${promo.discount}%`} off`, 'success');
            } else {
                addToast(`Minimum recharge of ${formatCurrency(promo.minAmount)} required`, 'warning');
            }
        } else {
            addToast('Invalid promo code', 'error');
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoCode('');
    };

    const calculateTotal = () => {
        const baseAmount = Number(amount) || 0;
        if (appliedPromo) {
            if (appliedPromo.type === 'flat') {
                return Math.max(0, baseAmount - appliedPromo.discount);
            } else {
                const discount = (baseAmount * appliedPromo.discount) / 100;
                const cappedDiscount = appliedPromo.maxDiscount ? Math.min(discount, appliedPromo.maxDiscount) : discount;
                return Math.max(0, baseAmount - cappedDiscount);
            }
        }
        return baseAmount;
    };

    const handleProceed = () => {
        if (!amount || Number(amount) < 100) {
            addToast('Minimum recharge amount is ₹100', 'warning');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            addToast('Redirecting to payment gateway...', 'info');
        }, 1000);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-[#2525FF]" />
                        Wallet Recharge
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Add funds to your wallet for shipping
                    </p>
                </div>
                <Link href="/seller/financials">
                    <Button variant="outline">View Transactions</Button>
                </Link>
            </div>

            {/* Current Balance Card */}
            <Card className="bg-gradient-to-br from-[#2525FF] to-[#1a1adb] text-white">
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
                        <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center">
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
                                <IndianRupee className="h-5 w-5 text-[#2525FF]" />
                                Enter Amount
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">₹</span>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
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
                                                ? "border-[#2525FF] bg-[#2525FF]/10 text-[#2525FF]"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        {formatCurrency(value)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500">Minimum recharge: ₹100</p>
                        </CardContent>
                    </Card>

                    {/* Payment Method */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-[#2525FF]" />
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
                                            ? "border-[#2525FF] bg-[#2525FF]/5 ring-2 ring-[#2525FF]/20"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-lg flex items-center justify-center",
                                        selectedMethod === method.id ? "bg-[#2525FF]/10" : "bg-gray-100"
                                    )}>
                                        <method.icon className={cn(
                                            "h-5 w-5",
                                            selectedMethod === method.id ? "text-[#2525FF]" : "text-gray-500"
                                        )} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{method.name}</p>
                                        <p className="text-sm text-gray-500">{method.description}</p>
                                    </div>
                                    <div className={cn(
                                        "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                        selectedMethod === method.id
                                            ? "border-[#2525FF] bg-[#2525FF]"
                                            : "border-gray-300"
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
                                <Gift className="h-5 w-5 text-[#2525FF]" />
                                Apply Promo Code
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {appliedPromo ? (
                                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                                        <div>
                                            <p className="font-semibold text-emerald-800">{appliedPromo.code}</p>
                                            <p className="text-sm text-emerald-600">
                                                {appliedPromo.type === 'flat'
                                                    ? `${formatCurrency(appliedPromo.discount)} off`
                                                    : `${appliedPromo.discount}% off (max ${formatCurrency(appliedPromo.maxDiscount || 0)})`
                                                }
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
                                    <span className="text-gray-500">Recharge Amount</span>
                                    <span className="font-medium">{amount ? formatCurrency(Number(amount)) : '₹0'}</span>
                                </div>
                                {appliedPromo && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>Discount ({appliedPromo.code})</span>
                                        <span>
                                            -{appliedPromo.type === 'flat'
                                                ? formatCurrency(appliedPromo.discount)
                                                : formatCurrency(Math.min((Number(amount) * appliedPromo.discount) / 100, appliedPromo.maxDiscount || Infinity))
                                            }
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">GST (0%)</span>
                                    <span className="text-emerald-600">Free</span>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span>{formatCurrency(calculateTotal())}</span>
                                </div>
                            </div>

                            <Button
                                className="w-full h-12"
                                onClick={handleProceed}
                                isLoading={isLoading}
                                disabled={!amount || Number(amount) < 100}
                            >
                                <Zap className="h-4 w-4 mr-2" />
                                Proceed to Pay
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>

                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                <Shield className="h-3.5 w-3.5" />
                                100% Secure Payment
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
