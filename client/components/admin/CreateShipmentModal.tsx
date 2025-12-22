"use client";

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/src/shared/components/Toast';
import { Package, MapPin, User, Phone, Weight, IndianRupee } from 'lucide-react';

interface CreateShipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CreateShipmentModal({ isOpen, onClose, onSuccess }: CreateShipmentModalProps) {
    const { addToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        pickupAddress: '',
        deliveryAddress: '',
        weight: '',
        courier: '',
        paymentMode: 'prepaid',
        amount: '',
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            addToast('Shipment created successfully!', 'success');
            onSuccess?.();
            onClose();
            // Reset form
            setStep(1);
            setFormData({
                customerName: '',
                customerPhone: '',
                pickupAddress: '',
                deliveryAddress: '',
                weight: '',
                courier: '',
                paymentMode: 'prepaid',
                amount: '',
            });
        }, 1500);
    };

    const isStep1Valid = formData.customerName && formData.customerPhone;
    const isStep2Valid = formData.pickupAddress && formData.deliveryAddress;
    const isStep3Valid = formData.weight && formData.courier;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Shipment" size="lg">
            <div className="space-y-6">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-6">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                                }`}>
                                {s}
                            </div>
                            <span className={`ml-2 text-sm ${step >= s ? 'text-gray-900' : 'text-gray-400'}`}>
                                {s === 1 ? 'Customer' : s === 2 ? 'Address' : 'Shipping'}
                            </span>
                            {s < 3 && <div className={`w-16 h-0.5 mx-4 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Customer Info */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                            <Input
                                placeholder="Enter customer name"
                                value={formData.customerName}
                                onChange={(e) => handleChange('customerName', e.target.value)}
                                icon={<User className="h-4 w-4" />}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <Input
                                placeholder="+91 XXXXX XXXXX"
                                value={formData.customerPhone}
                                onChange={(e) => handleChange('customerPhone', e.target.value)}
                                icon={<Phone className="h-4 w-4" />}
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Addresses */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
                            <Input
                                placeholder="Enter pickup address"
                                value={formData.pickupAddress}
                                onChange={(e) => handleChange('pickupAddress', e.target.value)}
                                icon={<MapPin className="h-4 w-4" />}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                            <Input
                                placeholder="Enter delivery address"
                                value={formData.deliveryAddress}
                                onChange={(e) => handleChange('deliveryAddress', e.target.value)}
                                icon={<MapPin className="h-4 w-4" />}
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Shipping Details */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                                <Input
                                    type="number"
                                    placeholder="0.5"
                                    value={formData.weight}
                                    onChange={(e) => handleChange('weight', e.target.value)}
                                    icon={<Weight className="h-4 w-4" />}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                <Input
                                    type="number"
                                    placeholder="500"
                                    value={formData.amount}
                                    onChange={(e) => handleChange('amount', e.target.value)}
                                    icon={<IndianRupee className="h-4 w-4" />}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Courier</label>
                            <Select
                                value={formData.courier}
                                onChange={(e) => handleChange('courier', e.target.value)}
                                options={[
                                    { label: 'Select courier...', value: '' },
                                    { label: 'Delhivery - ₹45 (2-3 days)', value: 'delhivery' },
                                    { label: 'Bluedart - ₹65 (1-2 days)', value: 'bluedart' },
                                    { label: 'Xpressbees - ₹42 (3-4 days)', value: 'xpressbees' },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleChange('paymentMode', 'prepaid')}
                                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${formData.paymentMode === 'prepaid'
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    Prepaid
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange('paymentMode', 'cod')}
                                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${formData.paymentMode === 'cod'
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    Cash on Delivery
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
                    >
                        {step > 1 ? 'Back' : 'Cancel'}
                    </Button>
                    {step < 3 ? (
                        <Button
                            onClick={() => setStep(s => s + 1)}
                            disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
                        >
                            Continue
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={!isStep3Valid || isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                <>
                                    <Package className="h-4 w-4 mr-2" />
                                    Create Shipment
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
