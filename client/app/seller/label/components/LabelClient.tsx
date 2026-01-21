"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import {
    FileText,
    Download,
    Printer,
    Search,
    Copy,
    Phone,
    QrCode,
    Truck,
    Package
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { motion, AnimatePresence } from 'framer-motion';

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

export function LabelClient() {
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
        }, 1200);
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
                        <div className="px-2.5 py-1 rounded-lg bg-[var(--primary-blue-soft)] border border-[var(--primary-blue-light)]/20 flex items-center gap-2">
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
                className="p-8 rounded-[var(--radius-3xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm print:hidden relative overflow-hidden"
            >
                {/* Visual Background Element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--primary-blue)]/5 to-transparent rounded-bl-full pointer-events-none -mr-16 -mt-16" />

                <div className="max-w-2xl relative z-10">
                    <label className="text-sm font-bold text-[var(--text-secondary)] mb-3 block uppercase tracking-wider">
                        Enter AWB Number
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)] group-focus-within:text-[var(--primary-blue)] transition-colors" />
                            <Input
                                placeholder="e.g., DL987654321IN"
                                value={awbInput}
                                onChange={(e) => setAwbInput(e.target.value)}
                                className="pl-14 h-14 rounded-2xl bg-[var(--bg-secondary)] border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] text-lg shadow-inner"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-14 px-8 rounded-2xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] shadow-brand-lg text-lg font-semibold transition-all hover:scale-105 active:scale-95"
                        >
                            {isSearching ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2"
                                >
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Fetching...</span>
                                </motion.div>
                            ) : 'Generate Label'}
                        </Button>
                    </div>
                    <div className="mt-4 flex gap-2">
                        {['DL987654321IN', 'AWB192837465'].map(awb => (
                            <button
                                key={awb}
                                onClick={() => { setAwbInput(awb); }}
                                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-subtle)]"
                            >
                                {awb}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Label Preview Area */}
            <AnimatePresence mode="wait">
                {shipmentData ? (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="grid gap-8 lg:grid-cols-3"
                    >
                        {/* Label Card */}
                        <div className="lg:col-span-2 print:col-span-3 print:shadow-none">
                            <div className="p-8 rounded-[var(--radius-3xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-xl print:border-none print:p-0 print:shadow-none">
                                <div className="flex items-center justify-between mb-8 print:hidden">
                                    <div>
                                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Label Preview</h3>
                                        <p className="text-sm text-[var(--text-muted)]">Verified shipping document</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={handleDownload} className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] h-10 px-4 rounded-xl">
                                            <Download className="h-4 w-4 mr-2" /> PDF
                                        </Button>
                                        <Button onClick={handlePrint} className="bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--text-secondary)] h-10 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                                            <Printer className="h-4 w-4 mr-2" /> Print
                                        </Button>
                                    </div>
                                </div>

                                {/* Actual Label Design - High Contrast for Realism */}
                                <div className="border-[3px] border-slate-900 rounded-xl bg-white text-slate-900 overflow-hidden print:border-2 print:border-black max-w-2xl mx-auto shadow-2xl transform transition-transform hover:scale-[1.01] duration-300">
                                    {/* Top Bar */}
                                    <div className="flex border-b-[3px] border-slate-900">
                                        <div className="flex-1 p-5 border-r-[3px] border-slate-900">
                                            <div className="flex items-center gap-4">
                                                <div className="border-[2.5px] border-slate-900 p-1.5 rounded-lg">
                                                    <Truck className="h-8 w-8 text-slate-900" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Carrier</p>
                                                    <span className="text-3xl font-black uppercase leading-none tracking-tight">{shipmentData.courier}</span>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                <span className="text-xs font-bold bg-slate-200 px-2 py-1 rounded border border-slate-300 uppercase tracking-wider">{shipmentData.service}</span>
                                                <span className="text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded uppercase tracking-wider">Standard</span>
                                            </div>
                                        </div>
                                        <div className="p-5 flex flex-col items-center justify-center min-w-[160px] bg-slate-50">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Payment</p>
                                            <h2 className="text-4xl font-black tracking-tight">{shipmentData.paymentMode}</h2>
                                            {shipmentData.paymentMode === 'COD' && (
                                                <p className="text-xl font-bold mt-1">₹{shipmentData.codAmount}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Addresses */}
                                    <div className="grid grid-cols-2 border-b-[3px] border-slate-900">
                                        <div className="p-6 border-r-[3px] border-slate-900">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1">
                                                From (Shipper)
                                            </p>
                                            <p className="font-bold text-base text-slate-900">{shipmentData.shipperDetails.name}</p>
                                            <p className="text-sm mt-1.5 leading-relaxed text-slate-600 font-medium">
                                                {shipmentData.shipperDetails.address}<br />
                                                {shipmentData.shipperDetails.city}, {shipmentData.shipperDetails.state}<br />
                                                <span className="font-bold text-slate-800">PIN: {shipmentData.shipperDetails.pincode}</span>
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-slate-500 bg-slate-100 py-1 px-2 rounded w-fit">
                                                <Phone className="h-3 w-3" /> {shipmentData.shipperDetails.phone}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-50/50">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">To (Consignee)</p>
                                            <p className="font-bold text-xl text-slate-900">{shipmentData.consigneeDetails.name}</p>
                                            <p className="text-sm mt-1.5 leading-relaxed text-slate-600 font-medium">
                                                {shipmentData.consigneeDetails.address}<br />
                                                {shipmentData.consigneeDetails.city}, {shipmentData.consigneeDetails.state}
                                            </p>
                                            <p className="text-3xl font-black mt-3 text-slate-900 tracking-wide">{shipmentData.consigneeDetails.pincode}</p>
                                            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-slate-500 bg-white border border-slate-200 py-1 px-2 rounded w-fit shadow-sm">
                                                <Phone className="h-3 w-3" /> {shipmentData.consigneeDetails.phone}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <div className="grid grid-cols-4 border-b-[3px] border-slate-900 text-xs text-slate-900 bg-white">
                                        <div className="p-4 border-r-[3px] border-slate-900 col-span-2">
                                            <p className="font-bold text-slate-400 uppercase mb-1 text-[10px] tracking-wider">Contents</p>
                                            <p className="font-bold truncate text-sm">{shipmentData.productDetails.name}</p>
                                            <p className="text-slate-500 font-mono mt-1 text-[10px]">SKU: {shipmentData.productDetails.sku}</p>
                                        </div>
                                        <div className="p-4 border-r-[3px] border-slate-900">
                                            <p className="font-bold text-slate-400 uppercase mb-1 text-[10px] tracking-wider">Weight</p>
                                            <p className="font-black text-sm">{shipmentData.weight}</p>
                                            <p className="text-[10px] text-slate-600 mt-0.5">{shipmentData.dimensions}</p>
                                        </div>
                                        <div className="p-4">
                                            <p className="font-bold text-slate-400 uppercase mb-1 text-[10px] tracking-wider">Date</p>
                                            <p className="font-bold">{shipmentData.createdAt}</p>
                                        </div>
                                    </div>

                                    {/* Barcode Area */}
                                    <div className="p-10 flex flex-col items-center justify-center bg-white relative">
                                        <div className="absolute top-4 right-4 border border-slate-200 rounded p-1">
                                            <QrCode className="h-16 w-16 text-slate-900" />
                                        </div>
                                        {/* Simulated Barcode Lines */}
                                        <div className="h-16 w-full max-w-sm bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Code_128_barcode_sample.svg/1200px-Code_128_barcode_sample.svg.png')] bg-cover bg-center opacity-90 grayscale contrast-150 mb-3" />
                                        <p className="font-mono font-bold text-3xl tracking-[0.3em] text-slate-900 mt-2">{shipmentData.awbNumber}</p>
                                        <p className="text-[10px] text-slate-400 uppercase mt-2 font-bold tracking-widest">Scan for Status</p>
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-slate-900 text-white p-3 text-center text-[10px] font-bold uppercase tracking-[0.3em]">
                                        Powered by Helix Logistics
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Sidebar */}
                        <div className="print:hidden space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-6 rounded-[var(--radius-3xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm"
                            >
                                <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-[var(--primary-blue)]" /> Quick Details
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/30 transition-colors group">
                                        <div>
                                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">AWB Number</p>
                                            <p className="font-mono font-bold text-[var(--text-primary)]">{shipmentData.awbNumber}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)] rounded-lg" onClick={() => copyToClipboard(shipmentData.awbNumber)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/30 transition-colors group">
                                        <div>
                                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Order ID</p>
                                            <p className="font-semibold text-[var(--text-primary)]">{shipmentData.orderId}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)] rounded-lg" onClick={() => copyToClipboard(shipmentData.orderId)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="p-6 rounded-[var(--radius-3xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm"
                            >
                                <Button className="w-full h-14 text-lg font-semibold bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] shadow-brand-lg mb-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={handlePrint}>
                                    <Printer className="h-5 w-5 mr-2" />
                                    Print Label
                                </Button>
                                <Button variant="outline" className="w-full h-14 bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl" onClick={handleDownload}>
                                    <Download className="h-5 w-5 mr-2" />
                                    Download PDF
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    /* Initial State */
                    !isSearching && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-32 text-center"
                        >
                            <div className="w-32 h-32 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-8 animate-[pulse_3s_ease-in-out_infinite]">
                                <Package className="h-12 w-12 text-[var(--text-muted)] opacity-50" />
                            </div>
                            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Ready to Generate</h3>
                            <p className="text-[var(--text-muted)] max-w-md mx-auto text-lg">
                                Enter a valid AWB number above to verify details and generate a compliant shipping label instantly.
                            </p>
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </div>
    );
}
