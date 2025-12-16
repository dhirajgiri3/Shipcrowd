"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    PackagePlus,
    User,
    MapPin,
    Package,
    CreditCard,
    Truck,
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    IndianRupee,
    Weight,
    Ruler,
    Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

const steps = [
    { id: 1, name: 'Customer Details', icon: User },
    { id: 2, name: 'Pickup Address', icon: Building2 },
    { id: 3, name: 'Package Details', icon: Package },
    { id: 4, name: 'Select Courier', icon: Truck },
    { id: 5, name: 'Confirm & Ship', icon: CheckCircle },
];

// Mock pickup addresses
const mockPickupAddresses = [
    { id: 'addr-1', name: 'Main Warehouse', address: '123, Industrial Area, Phase 2', city: 'Mumbai', pincode: '400001', isDefault: true },
    { id: 'addr-2', name: 'Secondary Office', address: '456, Business Park', city: 'Mumbai', pincode: '400071', isDefault: false },
];

// Mock courier rates
const mockCourierRates = [
    { id: 'cour-1', name: 'Delhivery', service: 'Surface', rate: 85, eta: '4-6 days', logo: 'DE' },
    { id: 'cour-2', name: 'Xpressbees', service: 'Express', rate: 105, eta: '2-3 days', logo: 'XB' },
    { id: 'cour-3', name: 'DTDC', service: 'Surface', rate: 78, eta: '5-7 days', logo: 'DT' },
    { id: 'cour-4', name: 'Bluedart', service: 'Air Express', rate: 145, eta: '1-2 days', logo: 'BD' },
];

export default function CreateOrderPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedPickup, setSelectedPickup] = useState('addr-1');
    const [selectedCourier, setSelectedCourier] = useState('');
    const { addToast } = useToast();

    const [formData, setFormData] = useState({
        // Customer Details
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        // Delivery Address
        deliveryAddress: '',
        deliveryCity: '',
        deliveryState: '',
        deliveryPincode: '',
        // Package Details
        productName: '',
        productSku: '',
        quantity: '1',
        weight: '',
        length: '',
        breadth: '',
        height: '',
        // Payment
        paymentMode: 'prepaid',
        invoiceValue: '',
        codAmount: '',
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const nextStep = () => {
        if (currentStep < 5) setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = () => {
        addToast('Order created successfully! AWB: DL987654321IN', 'success');
    };

    const selectedCourierData = mockCourierRates.find(c => c.id === selectedCourier);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/seller/orders">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Orders
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <PackagePlus className="h-6 w-6 text-[#2525FF]" />
                            Create New Order
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Single Order Creation</p>
                    </div>
                </div>
            </div>

            {/* Step Progress */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center font-medium transition-all",
                                            currentStep >= step.id
                                                ? "bg-[#2525FF] text-white"
                                                : "bg-gray-100 text-gray-400"
                                        )}
                                    >
                                        {currentStep > step.id ? (
                                            <CheckCircle className="h-5 w-5" />
                                        ) : (
                                            <step.icon className="h-5 w-5" />
                                        )}
                                    </div>
                                    <p className={cn(
                                        "text-xs mt-2 font-medium",
                                        currentStep >= step.id ? "text-gray-900" : "text-gray-400"
                                    )}>
                                        {step.name}
                                    </p>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={cn(
                                        "flex-1 h-0.5 mx-4",
                                        currentStep > step.id ? "bg-[#2525FF]" : "bg-gray-200"
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Step 1: Customer Details */}
            {currentStep === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-[#2525FF]" />
                            Customer Details
                        </CardTitle>
                        <CardDescription>Enter the recipient's information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Customer Name *</label>
                                <Input
                                    placeholder="Full name"
                                    value={formData.customerName}
                                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                                <Input
                                    placeholder="10-digit mobile number"
                                    value={formData.customerPhone}
                                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email (Optional)</label>
                            <Input
                                type="email"
                                placeholder="customer@example.com"
                                value={formData.customerEmail}
                                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                            />
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-[#2525FF]" />
                                Delivery Address
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Address Line *</label>
                                    <Input
                                        placeholder="House/Flat No., Street, Landmark"
                                        value={formData.deliveryAddress}
                                        onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">City *</label>
                                        <Input
                                            placeholder="City"
                                            value={formData.deliveryCity}
                                            onChange={(e) => handleInputChange('deliveryCity', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">State *</label>
                                        <Input
                                            placeholder="State"
                                            value={formData.deliveryState}
                                            onChange={(e) => handleInputChange('deliveryState', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">PIN Code *</label>
                                        <Input
                                            placeholder="6-digit pincode"
                                            value={formData.deliveryPincode}
                                            onChange={(e) => handleInputChange('deliveryPincode', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Pickup Address */}
            {currentStep === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[#2525FF]" />
                            Select Pickup Address
                        </CardTitle>
                        <CardDescription>Choose where the shipment will be picked up from</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {mockPickupAddresses.map((addr) => (
                            <div
                                key={addr.id}
                                onClick={() => setSelectedPickup(addr.id)}
                                className={cn(
                                    "border rounded-xl p-4 cursor-pointer transition-all",
                                    selectedPickup === addr.id
                                        ? "border-[#2525FF] bg-[#2525FF]/5 ring-2 ring-[#2525FF]/20"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900">{addr.name}</h3>
                                            {addr.isDefault && <Badge variant="info" className="text-xs">Default</Badge>}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                                        <p className="text-sm text-gray-600">{addr.city} - {addr.pincode}</p>
                                    </div>
                                    <div className={cn(
                                        "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                        selectedPickup === addr.id
                                            ? "border-[#2525FF] bg-[#2525FF]"
                                            : "border-gray-300"
                                    )}>
                                        {selectedPickup === addr.id && <CheckCircle className="h-3 w-3 text-white" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full mt-4">
                            + Add New Pickup Address
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Package Details */}
            {currentStep === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-[#2525FF]" />
                            Package Details
                        </CardTitle>
                        <CardDescription>Enter product and weight information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Product Name *</label>
                                <Input
                                    placeholder="e.g., Cotton T-Shirt"
                                    value={formData.productName}
                                    onChange={(e) => handleInputChange('productName', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">SKU</label>
                                <Input
                                    placeholder="e.g., TSH-001"
                                    value={formData.productSku}
                                    onChange={(e) => handleInputChange('productSku', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Quantity *</label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    <Weight className="h-3.5 w-3.5" />
                                    Weight (grams) *
                                </label>
                                <Input
                                    type="number"
                                    placeholder="e.g., 500"
                                    value={formData.weight}
                                    onChange={(e) => handleInputChange('weight', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <Ruler className="h-3.5 w-3.5" />
                                Dimensions (cm)
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                <Input
                                    type="number"
                                    placeholder="Length"
                                    value={formData.length}
                                    onChange={(e) => handleInputChange('length', e.target.value)}
                                />
                                <Input
                                    type="number"
                                    placeholder="Breadth"
                                    value={formData.breadth}
                                    onChange={(e) => handleInputChange('breadth', e.target.value)}
                                />
                                <Input
                                    type="number"
                                    placeholder="Height"
                                    value={formData.height}
                                    onChange={(e) => handleInputChange('height', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-[#2525FF]" />
                                Payment Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Payment Mode *</label>
                                    <select
                                        value={formData.paymentMode}
                                        onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                                        className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-300"
                                    >
                                        <option value="prepaid">Prepaid</option>
                                        <option value="cod">Cash on Delivery (COD)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Invoice Value (₹) *</label>
                                    <Input
                                        type="number"
                                        placeholder="e.g., 999"
                                        value={formData.invoiceValue}
                                        onChange={(e) => handleInputChange('invoiceValue', e.target.value)}
                                    />
                                </div>
                                {formData.paymentMode === 'cod' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">COD Amount (₹) *</label>
                                        <Input
                                            type="number"
                                            placeholder="Amount to collect"
                                            value={formData.codAmount}
                                            onChange={(e) => handleInputChange('codAmount', e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Select Courier */}
            {currentStep === 4 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-[#2525FF]" />
                            Select Courier Partner
                        </CardTitle>
                        <CardDescription>Choose the best option for your shipment</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {mockCourierRates.map((courier) => (
                            <div
                                key={courier.id}
                                onClick={() => setSelectedCourier(courier.id)}
                                className={cn(
                                    "border rounded-xl p-4 cursor-pointer transition-all",
                                    selectedCourier === courier.id
                                        ? "border-[#2525FF] bg-[#2525FF]/5 ring-2 ring-[#2525FF]/20"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                                            {courier.logo}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{courier.name}</h3>
                                            <p className="text-sm text-gray-500">{courier.service}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-gray-900">{formatCurrency(courier.rate)}</p>
                                        <p className="text-sm text-gray-500">{courier.eta}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Step 5: Confirm & Ship */}
            {currentStep === 5 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-[#2525FF]" />
                            Review & Confirm
                        </CardTitle>
                        <CardDescription>Review order details before shipping</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Customer */}
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Customer Details</h4>
                            <p className="font-semibold text-gray-900">{formData.customerName || 'Not provided'}</p>
                            <p className="text-sm text-gray-600">{formData.customerPhone || 'Not provided'}</p>
                            <p className="text-sm text-gray-600 mt-2">
                                {formData.deliveryAddress}, {formData.deliveryCity}, {formData.deliveryState} - {formData.deliveryPincode}
                            </p>
                        </div>

                        {/* Product */}
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Package Details</h4>
                            <p className="font-semibold text-gray-900">{formData.productName || 'Not provided'}</p>
                            <p className="text-sm text-gray-600">Weight: {formData.weight}g • Qty: {formData.quantity}</p>
                            <p className="text-sm text-gray-600">
                                Dimensions: {formData.length} × {formData.breadth} × {formData.height} cm
                            </p>
                        </div>

                        {/* Payment & Courier */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Payment</h4>
                                <Badge variant={formData.paymentMode === 'cod' ? 'warning' : 'success'} className="uppercase">
                                    {formData.paymentMode}
                                </Badge>
                                <p className="text-lg font-bold text-gray-900 mt-2">
                                    {formatCurrency(Number(formData.invoiceValue) || 0)}
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Courier</h4>
                                {selectedCourierData ? (
                                    <>
                                        <p className="font-semibold text-gray-900">{selectedCourierData.name}</p>
                                        <p className="text-sm text-gray-600">{selectedCourierData.service}</p>
                                        <p className="text-lg font-bold text-[#2525FF] mt-1">
                                            {formatCurrency(selectedCourierData.rate)}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-gray-500">Not selected</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                </Button>
                {currentStep < 5 ? (
                    <Button onClick={nextStep}>
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Create Order & Ship
                    </Button>
                )}
            </div>
        </div>
    );
}
