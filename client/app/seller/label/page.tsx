"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/core/Button';
import { Input } from '@/components/ui/core/Input';
import { Badge } from '@/components/ui/core/Badge';
import {
    FileText,
    Download,
    Printer,
    Search,
    Filter,
    RefreshCw,
    Copy,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    Clock,
    Package,
    Truck,
    Phone,
    QrCode
} from 'lucide-react';
import { cn } from '@/src/shared/utils';
import { useToast } from '@/components/ui/feedback/Toast';
import { motion } from 'framer-motion';

// Mock shipment data for label
const mockShipmentForLabel = {
    awbNumber: 'DL987654321IN',
    orderId: 'ORD-2024-001234',
    courier: 'Delhivery',
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
    const [currentTime, setCurrentTime] = useState(new Date());

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

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
        <div className="space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] mb-2"
                    >
                        <div className="px-2 py-1 rounded-md bg-[var(--primary-blue-soft)]/20 border border-[var(--primary-blue)]/20 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary-blue)] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary-blue)]"></span>
                            </span>
                            Live Generator
                        </div>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span className="text-[var(--text-muted)]">{currentTime.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-4xl font-bold text-[var(--text-primary)] tracking-tight"
                    >
                        Shipping Labels
                    </motion.h1>
                </div>
            </div>

            {/* Search Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm print:hidden"
            >
                <div className="max-w-2xl">
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                        Enter AWB Number to Generate Label
                    </label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                            <Input
                                placeholder="e.g., DL987654321IN"
                                value={awbInput}
                                onChange={(e) => setAwbInput(e.target.value)}
                                className="pl-10 h-12 rounded-xl bg-[var(--bg-secondary)] border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] text-lg"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-12 px-8 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] shadow-lg shadow-blue-500/20"
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Label Preview Area */}
            {shipmentData ? (
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Label Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="lg:col-span-2 print:col-span-3 print:shadow-none"
                    >
                        <div className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm print:border-none print:p-0">
                            <div className="flex items-center justify-between mb-6 print:hidden">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Preview</h3>
                                    <p className="text-sm text-[var(--text-muted)]">Check details before printing</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleDownload} className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                        <Download className="h-4 w-4 mr-2" /> PDF
                                    </Button>
                                    <Button onClick={handlePrint} className="bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--text-secondary)]">
                                        <Printer className="h-4 w-4 mr-2" /> Print
                                    </Button>
                                </div>
                            </div>

                            {/* Actual Label Design - Replicating standard industry label format with clean CSS */}
                            <div className="border-2 border-gray-900 rounded-lg p-0 bg-white text-black overflow-hidden print:border print:border-black">
                                {/* Top Bar */}
                                <div className="flex border-b-2 border-gray-900">
                                    <div className="flex-1 p-4 border-r-2 border-gray-900">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Carrier</p>
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-6 w-6" />
                                            <span className="text-2xl font-black uppercase">{shipmentData.courier}</span>
                                        </div>
                                        <p className="text-sm font-medium mt-1">{shipmentData.service}</p>
                                    </div>
                                    <div className="p-4 flex flex-col items-center justify-center min-w-[120px]">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Payment</p>
                                        <h2 className="text-2xl font-black">{shipmentData.paymentMode}</h2>
                                        {shipmentData.paymentMode === 'COD' && (
                                            <p className="text-lg font-bold">₹{shipmentData.codAmount}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Addresses */}
                                <div className="grid grid-cols-2 border-b-2 border-gray-900">
                                    <div className="p-4 border-r-2 border-gray-900">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">From (Shipper)</p>
                                        <p className="font-bold text-sm">{shipmentData.shipperDetails.name}</p>
                                        <p className="text-xs mt-1 leading-relaxed">
                                            {shipmentData.shipperDetails.address}<br />
                                            {shipmentData.shipperDetails.city}, {shipmentData.shipperDetails.state}<br />
                                            {shipmentData.shipperDetails.pincode}
                                        </p>
                                        <div className="flex items-center gap-1 mt-2 text-xs font-medium">
                                            <Phone className="h-3 w-3" /> {shipmentData.shipperDetails.phone}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">To (Consignee)</p>
                                        <p className="font-bold text-lg">{shipmentData.consigneeDetails.name}</p>
                                        <p className="text-sm mt-1 leading-relaxed">
                                            {shipmentData.consigneeDetails.address}<br />
                                            {shipmentData.consigneeDetails.city}, {shipmentData.consigneeDetails.state}
                                        </p>
                                        <p className="text-xl font-black mt-2">{shipmentData.consigneeDetails.pincode}</p>
                                        <div className="flex items-center gap-1 mt-2 text-xs font-medium">
                                            <Phone className="h-3 w-3" /> {shipmentData.consigneeDetails.phone}
                                        </div>
                                    </div>
                                </div>

                                {/* Product Info */}
                                <div className="grid grid-cols-4 border-b-2 border-gray-900 text-xs">
                                    <div className="p-3 border-r border-gray-900 col-span-2">
                                        <p className="font-bold text-gray-500 uppercase mb-1">Product</p>
                                        <p className="font-medium truncate">{shipmentData.productDetails.name}</p>
                                        <p className="text-gray-500">SKU: {shipmentData.productDetails.sku}</p>
                                    </div>
                                    <div className="p-3 border-r border-gray-900">
                                        <p className="font-bold text-gray-500 uppercase mb-1">Weight</p>
                                        <p className="font-bold text-sm">{shipmentData.weight}</p>
                                        <p className="text-[10px]">{shipmentData.dimensions}</p>
                                    </div>
                                    <div className="p-3">
                                        <p className="font-bold text-gray-500 uppercase mb-1">Date</p>
                                        <p className="font-medium">{shipmentData.createdAt}</p>
                                    </div>
                                </div>

                                {/* Barcode Area */}
                                <div className="p-6 flex flex-col items-center justify-center bg-white">
                                    <QrCode className="h-24 w-24 mb-2" />
                                    <p className="font-mono font-bold text-lg tracking-widest">{shipmentData.awbNumber}</p>
                                    <p className="text-[10px] text-gray-500 uppercase mt-1">Scan for Tracking</p>
                                </div>

                                {/* Footer */}
                                <div className="bg-black text-white p-2 text-center text-[10px] font-bold uppercase tracking-widest">
                                    Fulfilled by Shipcrowd
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Actions Sidebar */}
                    <div className="print:hidden space-y-6">
                        <div className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                            <h3 className="font-bold text-[var(--text-primary)] mb-4">Quick Details</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">AWB Number</p>
                                        <p className="font-mono font-semibold text-[var(--text-primary)]">{shipmentData.awbNumber}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--primary-blue)]" onClick={() => copyToClipboard(shipmentData.awbNumber)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)]">Order ID</p>
                                        <p className="font-semibold text-[var(--text-primary)]">{shipmentData.orderId}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--primary-blue)]" onClick={() => copyToClipboard(shipmentData.orderId)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                            <Button className="w-full h-12 text-lg font-semibold bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] shadow-lg shadow-blue-500/20 mb-3" onClick={handlePrint}>
                                <Printer className="h-5 w-5 mr-2" />
                                Print Label
                            </Button>
                            <Button variant="outline" className="w-full h-12 bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]" onClick={handleDownload}>
                                <Download className="h-5 w-5 mr-2" />
                                Download PDF
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Empty State with Animation */
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                >
                    <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <FileText className="h-10 w-10 text-[var(--text-muted)] opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Ready to Generate</h3>
                    <p className="text-[var(--text-muted)] max-w-md mt-2">
                        Enter a valid AWB number above to verify details and generate a compliant shipping label instantly.
                    </p>
                </motion.div>
            )}
        </div>
    );
}
