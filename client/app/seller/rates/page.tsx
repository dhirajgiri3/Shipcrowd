"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import {
    Calculator,
    MapPin,
    Package,
    Weight,
    Ruler,
    IndianRupee,
    Truck,
    Clock,
    Star,
    ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { getCourierLogo } from '@/lib/constants';

// Mock rate results
const mockRates = [
    { courier: 'Delhivery', rate: 85, eta: '2-3 days', rating: 4.5, recommended: true },
    { courier: 'Xpressbees', rate: 78, eta: '3-4 days', rating: 4.2, recommended: false },
    { courier: 'DTDC', rate: 92, eta: '2-3 days', rating: 4.0, recommended: false },
    { courier: 'Bluedart', rate: 120, eta: '1-2 days', rating: 4.8, recommended: false },
    { courier: 'EcomExpress', rate: 82, eta: '3-4 days', rating: 4.1, recommended: false },
];

export default function RatesPage() {
    const [formData, setFormData] = useState({
        originPincode: '',
        destinationPincode: '',
        weight: '',
        length: '',
        width: '',
        height: '',
        paymentMode: 'prepaid'
    });
    const [showResults, setShowResults] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const { addToast } = useToast();

    const handleCalculate = () => {
        if (!formData.originPincode || !formData.destinationPincode || !formData.weight) {
            addToast('Please fill in required fields', 'error');
            return;
        }
        setIsCalculating(true);
        setTimeout(() => {
            setShowResults(true);
            setIsCalculating(false);
            addToast('Rates calculated successfully!', 'success');
        }, 1000);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Calculator className="h-6 w-6 text-indigo-600" />
                        Rate Calculator
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Compare shipping rates across all courier partners</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Calculator Form */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Shipment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Origin & Destination */}
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    Origin Pincode *
                                </label>
                                <Input
                                    placeholder="e.g. 400001"
                                    value={formData.originPincode}
                                    onChange={(e) => setFormData({ ...formData, originPincode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    Destination Pincode *
                                </label>
                                <Input
                                    placeholder="e.g. 110001"
                                    value={formData.destinationPincode}
                                    onChange={(e) => setFormData({ ...formData, destinationPincode: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Weight */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Weight className="h-4 w-4 text-gray-400" />
                                Weight (kg) *
                            </label>
                            <Input
                                type="number"
                                placeholder="e.g. 0.5"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                            />
                        </div>

                        {/* Dimensions */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Ruler className="h-4 w-4 text-gray-400" />
                                Dimensions (cm) - Optional
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <Input
                                    placeholder="L"
                                    value={formData.length}
                                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                                />
                                <Input
                                    placeholder="W"
                                    value={formData.width}
                                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                                />
                                <Input
                                    placeholder="H"
                                    value={formData.height}
                                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Payment Mode */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-gray-400" />
                                Payment Mode
                            </label>
                            <Select
                                options={[
                                    { label: 'Prepaid', value: 'prepaid' },
                                    { label: 'COD', value: 'cod' },
                                ]}
                                value={formData.paymentMode}
                                onChange={(val) => setFormData({ ...formData, paymentMode: val })}
                            />
                        </div>

                        <Button
                            className="w-full mt-4"
                            onClick={handleCalculate}
                            disabled={isCalculating}
                        >
                            {isCalculating ? 'Calculating...' : 'Calculate Rates'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results */}
                <div className="lg:col-span-2">
                    {!showResults ? (
                        <Card className="h-full flex items-center justify-center bg-gray-50">
                            <CardContent className="text-center py-12">
                                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Enter shipment details to see available rates</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">{mockRates.length}</span> courier options available
                                </p>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span>{formData.originPincode}</span>
                                    <ArrowRight className="h-4 w-4" />
                                    <span>{formData.destinationPincode}</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{formData.weight} kg</span>
                                </div>
                            </div>

                            {mockRates.map((rate, idx) => (
                                <Card
                                    key={idx}
                                    className={`hover:shadow-md transition-shadow ${rate.recommended ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={getCourierLogo(rate.courier)}
                                                    alt={rate.courier}
                                                    className="w-10 h-10 object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${rate.courier}&background=random&color=fff&size=40`;
                                                    }}
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900">{rate.courier}</span>
                                                        {rate.recommended && (
                                                            <Badge variant="success" className="text-xs">Recommended</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {rate.eta}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Star className="h-3.5 w-3.5 text-amber-500" />
                                                            {rate.rating}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(rate.rate)}</p>
                                                    <p className="text-xs text-gray-500">All inclusive</p>
                                                </div>
                                                <Button
                                                    onClick={() => addToast(`Creating shipment with ${rate.courier}...`, 'info')}
                                                >
                                                    Ship Now
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
