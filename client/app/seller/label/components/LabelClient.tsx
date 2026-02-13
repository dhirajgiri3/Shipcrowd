"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    FileText,
    Download,
    Printer,
    Search,
    Copy,
    Phone,
    QrCode,
    Truck,
    Package,
    AlertCircle
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useShipmentByAwb, useGenerateLabel } from '@/src/core/api/hooks/seller/useShipment';

export function LabelClient() {
    const [awbInput, setAwbInput] = useState('');
    const [searchedAwb, setSearchedAwb] = useState('');
    const { addToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());

    // API Hooks
    const { data: shipmentData, isLoading: isSearching, error } = useShipmentByAwb(searchedAwb);
    const { mutate: generateLabel, isPending: isGenerating } = useGenerateLabel();

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const handleSearch = () => {
        const normalizedAwb = awbInput.trim();
        if (!normalizedAwb) {
            addToast('Please enter an AWB number', 'warning');
            return;
        }
        setSearchedAwb(normalizedAwb);
    };

    const handlePrint = () => {
        if (!shipmentData) return;

        generateLabel(shipmentData.shipmentId, {
            onSuccess: (response) => {
                if (response?.labelUrl) {
                    window.open(response.labelUrl, '_blank');
                } else {
                    addToast('Label generated successfully', 'success');
                }
            }
        });
    };

    const handleDownload = () => {
        if (!shipmentData) return;

        generateLabel(shipmentData.shipmentId, {
            onSuccess: (response) => {
                if (response?.labelUrl) {
                    window.open(response.labelUrl, '_blank');
                } else {
                    addToast('Downloading label...', 'success');
                }
            }
        });
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
                className="p-8 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm print:hidden relative overflow-hidden"
            >
                {/* Visual Background Element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--primary-blue)]/5 to-transparent rounded-bl-full pointer-events-none -mr-16 -mt-16" />

                <div className="max-w-2xl relative z-10">
                    <label className="text-sm font-bold text-[var(--text-secondary)] mb-3 block uppercase tracking-wider">
                        Enter AWB Number
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <Input
                                placeholder="e.g., DL987654321IN"
                                value={awbInput}
                                onChange={(e) => setAwbInput(e.target.value)}
                                className="pl-14 h-14 rounded-2xl text-lg shadow-inner"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                icon={<Search className="w-5 h-5 text-[var(--text-muted)]" />}
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-14 px-8 rounded-2xl shadow-brand-lg text-lg font-semibold transition-all hover:scale-105 active:scale-95"
                            variant="primary"
                        >
                            {isSearching ? (
                                <Loader size="sm" variant="spinner" className="text-white" />
                            ) : 'Generate Label'}
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Label Preview Area */}
            <AnimatePresence mode="wait">
                {/* Error State */}
                {searchedAwb && error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="py-12 flex justify-center"
                    >
                        <EmptyState
                            icon={<AlertCircle className="w-12 h-12" />}
                            title="Shipment Not Found"
                            description={`We couldn't find a shipment with AWB ${searchedAwb}. Please check and try again.`}
                            action={{
                                label: 'Clear Search',
                                onClick: () => { setAwbInput(''); setSearchedAwb(''); },
                                variant: 'outline' as const
                            }}
                        />
                    </motion.div>
                )}

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
                            <Card className="rounded-[var(--radius-3xl)] print:border-none print:shadow-none bg-[var(--bg-primary)]">
                                <div className="p-8 print:p-0">
                                    <div className="flex items-center justify-between mb-8 print:hidden">
                                        <div>
                                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Label Preview</h3>
                                            <p className="text-sm text-[var(--text-muted)]">Verified shipping document</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={handleDownload}
                                                disabled={isGenerating}
                                                className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]"
                                            >
                                                {isGenerating ? <Loader size="sm" /> : <Download className="h-4 w-4 mr-2" />}
                                                {isGenerating ? 'Generating...' : 'PDF'}
                                            </Button>
                                            <Button
                                                onClick={handlePrint}
                                                disabled={isGenerating}
                                                className="bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--text-secondary)] shadow-lg hover:shadow-xl transition-all"
                                            >
                                                {isGenerating ? <Loader size="sm" className="text-current" /> : <Printer className="h-4 w-4 mr-2" />}
                                                {isGenerating ? 'Generating...' : 'Print'}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Actual Label Design - High Contrast for Realism */}
                                    <div className="border-[3px] border-[var(--text-primary)] rounded-xl bg-white text-black overflow-hidden print:border-2 print:border-black max-w-2xl mx-auto shadow-2xl transform transition-transform hover:scale-[1.01] duration-300">
                                        {/* Top Bar */}
                                        <div className="flex border-b-[3px] border-black">
                                            <div className="flex-1 p-5 border-r-[3px] border-black">
                                                <div className="flex items-center gap-4">
                                                    <div className="border-[2.5px] border-black p-1.5 rounded-lg">
                                                        <Truck className="h-8 w-8 text-black" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Carrier</p>
                                                        <span className="text-3xl font-black uppercase leading-none tracking-tight">{shipmentData.courier || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex items-center gap-2">
                                                    <span className="text-xs font-bold bg-neutral-200 px-2 py-1 rounded border border-neutral-300 uppercase tracking-wider">{shipmentData.service || 'Standard'}</span>
                                                    <span className="text-xs font-bold bg-black text-white px-2 py-1 rounded uppercase tracking-wider">Standard</span>
                                                </div>
                                            </div>
                                            <div className="p-5 flex flex-col items-center justify-center min-w-[160px] bg-neutral-50">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Payment</p>
                                                <h2 className="text-4xl font-black tracking-tight">{shipmentData.paymentMode || 'PREPAID'}</h2>
                                                {shipmentData.paymentMode === 'COD' && (
                                                    <p className="text-xl font-bold mt-1">{formatCurrency(shipmentData.codAmount || 0)}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Addresses */}
                                        <div className="grid grid-cols-2 border-b-[3px] border-black">
                                            <div className="p-6 border-r-[3px] border-black">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-1">
                                                    From (Shipper)
                                                </p>
                                                <p className="font-bold text-base text-black">{shipmentData.shipperDetails?.name || 'N/A'}</p>
                                                <p className="text-sm mt-1.5 leading-relaxed text-neutral-600 font-medium">
                                                    {shipmentData.shipperDetails?.address}<br />
                                                    {shipmentData.shipperDetails?.city}, {shipmentData.shipperDetails?.state}<br />
                                                    <span className="font-bold text-neutral-800">PIN: {shipmentData.shipperDetails?.pincode}</span>
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-neutral-500 bg-neutral-100 py-1 px-2 rounded w-fit">
                                                    <Phone className="h-3 w-3" /> {shipmentData.shipperDetails?.phone || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="p-6 bg-neutral-50/50">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">To (Consignee)</p>
                                                <p className="font-bold text-xl text-black">{shipmentData.consigneeDetails?.name || 'N/A'}</p>
                                                <p className="text-sm mt-1.5 leading-relaxed text-neutral-600 font-medium">
                                                    {shipmentData.consigneeDetails?.address}<br />
                                                    {shipmentData.consigneeDetails?.city}, {shipmentData.consigneeDetails?.state}
                                                </p>
                                                <p className="text-3xl font-black mt-3 text-black tracking-wide">{shipmentData.consigneeDetails?.pincode}</p>
                                                <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-neutral-500 bg-white border border-neutral-200 py-1 px-2 rounded w-fit shadow-sm">
                                                    <Phone className="h-3 w-3" /> {shipmentData.consigneeDetails?.phone || 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Product Info */}
                                        <div className="grid grid-cols-4 border-b-[3px] border-black text-xs text-black bg-white">
                                            <div className="p-4 border-r-[3px] border-black col-span-2">
                                                <p className="font-bold text-neutral-400 uppercase mb-1 text-[10px] tracking-wider">Contents</p>
                                                <p className="font-bold truncate text-sm">{shipmentData.productDetails?.name || 'Shipment Content'}</p>
                                                <p className="text-neutral-500 font-mono mt-1 text-[10px]">SKU: {shipmentData.productDetails?.sku || 'N/A'}</p>
                                            </div>
                                            <div className="p-4 border-r-[3px] border-black">
                                                <p className="font-bold text-neutral-400 uppercase mb-1 text-[10px] tracking-wider">Weight</p>
                                                <p className="font-black text-sm">{shipmentData.weight} kg</p>
                                                <p className="text-[10px] text-neutral-600 mt-0.5">{shipmentData.dimensions || 'N/A'}</p>
                                            </div>
                                            <div className="p-4">
                                                <p className="font-bold text-neutral-400 uppercase mb-1 text-[10px] tracking-wider">Date</p>
                                                <p className="font-bold">{shipmentData.createdAt ? formatDate(shipmentData.createdAt) : formatDate(new Date().toISOString())}</p>
                                            </div>
                                        </div>

                                        {/* Barcode Area */}
                                        <div className="p-10 flex flex-col items-center justify-center bg-white relative">
                                            <div className="absolute top-4 right-4 border border-neutral-200 rounded p-1">
                                                <QrCode className="h-16 w-16 text-black" />
                                            </div>
                                            {/* Simulated Barcode Lines (CSS/Image could be improved for real generation) */}
                                            <div className="h-16 w-full max-w-sm bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Code_128_barcode_sample.svg/1200px-Code_128_barcode_sample.svg.png')] bg-cover bg-center opacity-90 grayscale contrast-150 mb-3" />
                                            <p className="font-mono font-bold text-3xl tracking-[0.3em] text-black mt-2">{shipmentData.awbNumber || 'N/A'}</p>
                                            <p className="text-[10px] text-neutral-400 uppercase mt-2 font-bold tracking-widest">Scan for Status</p>
                                        </div>

                                        {/* Footer */}
                                        <div className="bg-black text-white p-3 text-center text-[10px] font-bold uppercase tracking-[0.3em]">
                                            Powered by Shipcrowd Logistics
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Actions Sidebar */}
                        <div className="print:hidden space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="rounded-[var(--radius-3xl)] shadow-sm">
                                    <div className="p-6">
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
                                                    <p className="font-semibold text-[var(--text-primary)]">{shipmentData.orderId || 'N/A'}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)] rounded-lg" onClick={() => copyToClipboard(shipmentData.orderId)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="rounded-[var(--radius-3xl)] shadow-sm">
                                    <div className="p-6 space-y-4">
                                        <Button
                                            className="w-full h-14 text-lg font-semibold bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] shadow-brand-lg rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            onClick={handlePrint}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? <Loader size="sm" className="mr-2 text-white" /> : <Printer className="h-5 w-5 mr-2" />}
                                            Print Label
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full h-14 bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl"
                                            onClick={handleDownload}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? <Loader size="sm" className="mr-2" /> : <Download className="h-5 w-5 mr-2" />}
                                            Download PDF
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    /* Initial State */
                    !isSearching && !error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-32 text-center"
                        >
                            <EmptyState
                                icon={<Package className="w-12 h-12" />}
                                title="Ready to Generate"
                                description="Enter a valid AWB number above to verify details and generate a compliant shipping label instantly."
                                className="border-none shadow-none bg-transparent"
                            />
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </div>
    );
}
