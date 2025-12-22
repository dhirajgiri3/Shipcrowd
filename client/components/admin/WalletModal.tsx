"use client";

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/src/shared/components/Toast';
import { IndianRupee, CreditCard, Wallet, CheckCircle } from 'lucide-react';

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const quickAmounts = [500, 1000, 2000, 5000, 10000];

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
    const { addToast } = useToast();
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('upi');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleRecharge = () => {
        if (!amount || parseInt(amount) < 100) {
            addToast('Minimum recharge amount is ₹100', 'warning');
            return;
        }
        setIsProcessing(true);

        // Simulate payment processing
        setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
            addToast('Wallet recharged successfully!', 'success');

            // Reset and close after success animation
            setTimeout(() => {
                setIsSuccess(false);
                setAmount('');
                onClose();
            }, 2000);
        }, 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Recharge Wallet">
            <div className="space-y-6">
                {/* Success State */}
                {isSuccess ? (
                    <div className="py-8 text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Payment Successful!</h3>
                        <p className="text-gray-500 mt-1">₹{amount} has been added to your wallet</p>
                    </div>
                ) : (
                    <>
                        {/* Current Balance */}
                        <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
                            <p className="text-sm opacity-80">Current Balance</p>
                            <p className="text-3xl font-bold">₹24,500.00</p>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Enter Amount</label>
                            <Input
                                type="number"
                                placeholder="Enter amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                icon={<IndianRupee className="h-4 w-4" />}
                                className="text-lg"
                            />
                            <div className="flex gap-2 mt-3">
                                {quickAmounts.map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setAmount(amt.toString())}
                                        className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${amount === amt.toString()
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        ₹{amt.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('upi')}
                                    className={`p-3 rounded-lg border text-center transition-colors ${paymentMethod === 'upi'
                                            ? 'bg-indigo-50 border-indigo-500'
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="text-lg mb-1">📱</div>
                                    <span className="text-xs font-medium">UPI</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('card')}
                                    className={`p-3 rounded-lg border text-center transition-colors ${paymentMethod === 'card'
                                            ? 'bg-indigo-50 border-indigo-500'
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <CreditCard className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                                    <span className="text-xs font-medium">Card</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('netbanking')}
                                    className={`p-3 rounded-lg border text-center transition-colors ${paymentMethod === 'netbanking'
                                            ? 'bg-indigo-50 border-indigo-500'
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <Wallet className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                                    <span className="text-xs font-medium">Net Banking</span>
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={onClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={handleRecharge} disabled={isProcessing} className="flex-1">
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    <>
                                        <IndianRupee className="h-4 w-4 mr-1" />
                                        Pay {amount ? `₹${parseInt(amount).toLocaleString()}` : ''}
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
