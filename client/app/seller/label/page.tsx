"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/shared/components/card';
import { Button } from '@/src/shared/components/button';
import { Input } from '@/src/shared/components/Input';
import { Badge } from '@/src/shared/components/badge';
import {
    FileText,
    Search,
    Download,
    Printer,
    Package,
    MapPin,
    Phone,
    User,
    Truck,
    QrCode,
    Copy,
    CheckCircle
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/src/shared/components/Toast';

// Mock shipment data for label
const mockShipmentForLabel = {
    awbNumber: 'DL987654321IN',
    orderId: 'ORD-2024-001234',
    courier: 'Delhivery',
    courierLogo: '/logos/couriers/delhivery.png',
    service: 'Surface Express',
    createdAt: '2024-12-11',
    weight: '1.5 kg',
    dimensions: '20 x 15 x 10 cm',
    paymentMode: 'COD',
    codAmount: 1299,
    shipperDetails: {
        name: 'Fashion Hub India',
        address: '123, Industrial Area, Phase 2',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        phone: '+91 98765 43210',
    },
    consigneeDetails: {
        name: 'Rahul Sharma',
        address: '456, Green Park Extension',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110016',
        phone: '+91 87654 32109',
    },
    productDetails: {
        name: 'Premium Cotton T-Shirt',
        sku: 'TSH-BLK-XL-001',
        quantity: 2,
    },
};

export default function ShippingLabelPage() {
    const [awbInput, setAwbInput] = useState('');
    const [shipmentData, setShipmentData] = useState<typeof mockShipmentForLabel | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const { addToast } = useToast();

    const handleSearch = () => {
        if (!awbInput.trim()) {
            addToast('Please enter an AWB number', 'warning');
            return;
        }

        setIsSearching(true);
        // Simulate API call
        setTimeout(() => {
            setShipmentData(mockShipmentForLabel);
            setIsSearching(false);
            addToast('Shipment found!', 'success');
        }, 800);
    };

    const handlePrint = () => {
        addToast('Opening print dialog...', 'info');
        window.print();
    };

    const handleDownload = () => {
        addToast('Downloading label as PDF...', 'success');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast(`Copied: ${text}`, 'success');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <FileText className="h-6 w-6 text-[#2525FF]" />
                        Shipping Labels
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Generate and download shipping labels for your orders
                    </p>
                </div>
            </div>

            {/* Search Section */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Enter AWB Number
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g., DL987654321IN"
                                    value={awbInput}
                                    onChange={(e) => setAwbInput(e.target.value)}
                                    className="flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Button onClick={handleSearch} isLoading={isSearching}>
                                    <Search className="h-4 w-4 mr-2" />
                                    Search
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Label Preview */}
            {shipmentData && (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Label Card */}
                    <Card className="lg:col-span-2 print:shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between print:hidden">
                            <div>
                                <CardTitle className="text-lg">Shipping Label Preview</CardTitle>
                                <CardDescription>Review before printing</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleDownload}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                </Button>
                                <Button onClick={handlePrint}>
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print Label
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Actual Label Design */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-[var(--bg-primary)]">
                                {/* Header with AWB */}
                                <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4 mb-4">
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] uppercase">Courier Partner</p>
                                        <p className="text-xl font-bold text-[var(--text-primary)]">{shipmentData.courier}</p>
                                        <p className="text-sm text-gray-600">{shipmentData.service}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-[var(--text-muted)] uppercase">AWB Number</p>
                                        <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">{shipmentData.awbNumber}</p>
                                        <div className="mt-2 bg-[var(--bg-tertiary)] p-2 rounded">
                                            <QrCode className="h-16 w-16 text-gray-800 mx-auto" />
                                        </div>
                                    </div>
                                </div>

                                {/* Addresses Section */}
                                <div className="grid grid-cols-2 gap-6 border-b border-gray-200 pb-4 mb-4">
                                    {/* From */}
                                    <div>
                                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            Ship From
                                        </p>
                                        <div className="text-sm text-[var(--text-primary)]">
                                            <p className="font-semibold">{shipmentData.shipperDetails.name}</p>
                                            <p>{shipmentData.shipperDetails.address}</p>
                                            <p>{shipmentData.shipperDetails.city}, {shipmentData.shipperDetails.state}</p>
                                            <p className="font-semibold">{shipmentData.shipperDetails.pincode}</p>
                                            <p className="flex items-center gap-1 mt-1">
                                                <Phone className="h-3 w-3" />
                                                {shipmentData.shipperDetails.phone}
                                            </p>
                                        </div>
                                    </div>

                                    {/* To */}
                                    <div className="border-l pl-6">
                                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            Ship To
                                        </p>
                                        <div className="text-sm text-gray-900">
                                            <p className="font-semibold text-lg">{shipmentData.consigneeDetails.name}</p>
                                            <p>{shipmentData.consigneeDetails.address}</p>
                                            <p>{shipmentData.consigneeDetails.city}, {shipmentData.consigneeDetails.state}</p>
                                            <p className="font-bold text-xl">{shipmentData.consigneeDetails.pincode}</p>
                                            <p className="flex items-center gap-1 mt-1">
                                                <Phone className="h-3 w-3" />
                                                {shipmentData.consigneeDetails.phone}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Product & Order Details */}
                                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-4 mb-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Product</p>
                                        <p className="text-sm font-medium text-gray-900">{shipmentData.productDetails.name}</p>
                                        <p className="text-xs text-gray-500">SKU: {shipmentData.productDetails.sku}</p>
                                        <p className="text-xs text-gray-500">Qty: {shipmentData.productDetails.quantity}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Weight</p>
                                        <p className="text-sm font-medium text-gray-900">{shipmentData.weight}</p>
                                        <p className="text-xs text-gray-500">{shipmentData.dimensions}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Order ID</p>
                                        <p className="text-sm font-medium text-gray-900">{shipmentData.orderId}</p>
                                        <p className="text-xs text-gray-500">{shipmentData.createdAt}</p>
                                    </div>
                                </div>

                                {/* Payment Section */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Badge
                                            variant={shipmentData.paymentMode === 'COD' ? 'warning' : 'success'}
                                            className="text-sm px-3 py-1"
                                        >
                                            {shipmentData.paymentMode}
                                        </Badge>
                                        {shipmentData.paymentMode === 'COD' && (
                                            <p className="text-lg font-bold text-gray-900">
                                                Collect: ₹{shipmentData.codAmount}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">Powered by ShipCrowd</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions Sidebar */}
                    <Card className="print:hidden">
                        <CardHeader>
                            <CardTitle className="text-lg">Shipment Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                                    <div>
                                        <p className="text-xs text-gray-500">AWB Number</p>
                                        <p className="font-mono font-semibold text-gray-900">{shipmentData.awbNumber}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(shipmentData.awbNumber)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                                    <div>
                                        <p className="text-xs text-gray-500">Order ID</p>
                                        <p className="font-semibold text-gray-900">{shipmentData.orderId}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(shipmentData.orderId)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                                    <p className="text-xs text-gray-500">Courier</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Truck className="h-4 w-4 text-[#2525FF]" />
                                        <p className="font-semibold text-gray-900">{shipmentData.courier}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{shipmentData.service}</p>
                                </div>

                                <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                                    <p className="text-xs text-gray-500">Package</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Package className="h-4 w-4 text-gray-400" />
                                        <p className="font-semibold text-gray-900">{shipmentData.weight}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{shipmentData.dimensions}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 space-y-2">
                                <Button className="w-full" onClick={handlePrint}>
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print Label
                                </Button>
                                <Button variant="outline" className="w-full" onClick={handleDownload}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Empty State */}
            {!shipmentData && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Generate Shipping Labels</h3>
                        <p className="text-gray-500 mt-1 max-w-md mx-auto">
                            Enter an AWB number above to fetch shipment details and generate a printable shipping label
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
