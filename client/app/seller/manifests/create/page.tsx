/**
 * Create Manifest Wizard Page
 * 
 * Multi-step wizard for creating a new manifest:
 * - Step 1: Select courier partner
 * - Step 2: Select shipments
 * - Step 3: Review and generate
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    useEligibleShipments,
    useCreateManifest,
} from '@/src/core/api/hooks/useManifests';
import { Loader } from '@/src/components/ui';
import { toast } from 'sonner';
import {
    ArrowLeft,
    ArrowRight,
    Truck,
    Package,
    Check,
    CheckCircle2,
    Circle,
    FileText,
    Calendar,
    Clock,
    Search,
    ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import type {
    CourierPartner,
    ManifestShipment,
    CreateManifestPayload,
} from '@/src/types/api/manifest.types';

// ==================== Courier Options ====================

const courierOptions: { value: CourierPartner; label: string; logo?: string }[] = [
    { value: 'velocity', label: 'Velocity' },
    { value: 'delhivery', label: 'Delhivery' },
    { value: 'ekart', label: 'Ekart' },
    { value: 'xpressbees', label: 'XpressBees' },
    { value: 'bluedart', label: 'BlueDart' },
    { value: 'shadowfax', label: 'Shadowfax' },
    { value: 'ecom_express', label: 'Ecom Express' },
];

const pickupSlots = [
    { start: '09:00', end: '12:00', label: 'Morning (9 AM - 12 PM)' },
    { start: '12:00', end: '15:00', label: 'Afternoon (12 PM - 3 PM)' },
    { start: '15:00', end: '18:00', label: 'Evening (3 PM - 6 PM)' },
];

// ==================== Component ====================

export default function CreateManifestPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    // Wizard data
    const [selectedCourier, setSelectedCourier] = useState<CourierPartner | null>(null);
    const [selectedShipments, setSelectedShipments] = useState<string[]>([]);
    const [pickupDate, setPickupDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [pickupSlot, setPickupSlot] = useState<{ start: string; end: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // API hooks
    const {
        data: eligibleShipments,
        isLoading: isLoadingShipments
    } = useEligibleShipments(selectedCourier ?? undefined, {
        enabled: currentStep === 2 && !!selectedCourier,
    });

    const { mutate: createManifest, isPending: isCreating } = useCreateManifest();

    // Steps configuration
    const steps = [
        { id: 1, title: 'Select Courier', description: 'Choose courier partner' },
        { id: 2, title: 'Select Shipments', description: 'Add shipments to manifest' },
        { id: 3, title: 'Review & Create', description: 'Confirm and generate' },
    ];

    // Filter shipments by search
    const filteredShipments = eligibleShipments?.filter(shipment =>
        shipment.awbNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.destination.city.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

    // Validation
    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return !!selectedCourier;
            case 2:
                return selectedShipments.length > 0;
            case 3:
                return pickupDate && pickupSlot;
            default:
                return false;
        }
    };

    // Handlers
    const handleNext = () => {
        if (currentStep < totalSteps && canProceed()) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        if (!selectedCourier || selectedShipments.length === 0 || !pickupDate || !pickupSlot) {
            toast.error('Please complete all required fields');
            return;
        }

        const payload: CreateManifestPayload = {
            courierPartner: selectedCourier,
            shipmentIds: selectedShipments,
            pickupDate,
            pickupSlot,
        };

        createManifest(payload, {
            onSuccess: (data) => {
                router.push(`/seller/manifests/${data.manifest._id}`);
            },
        });
    };

    const toggleShipment = (shipmentId: string) => {
        setSelectedShipments(prev =>
            prev.includes(shipmentId)
                ? prev.filter(id => id !== shipmentId)
                : [...prev, shipmentId]
        );
    };

    const selectAllShipments = () => {
        if (filteredShipments.length === selectedShipments.length) {
            setSelectedShipments([]);
        } else {
            setSelectedShipments(filteredShipments.map(s => s.shipmentId));
        }
    };

    // Calculate totals
    const selectedShipmentsData = eligibleShipments?.filter(s =>
        selectedShipments.includes(s.shipmentId)
    ) ?? [];
    const totalWeight = selectedShipmentsData.reduce((sum, s) => sum + s.weight, 0);
    const totalCod = selectedShipmentsData.reduce((sum, s) => sum + (s.codAmount ?? 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/seller/manifests"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Manifests
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Create Manifest
                    </h1>
                </div>

                {/* Progress Indicator */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                {/* Step Circle */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-colors ${currentStep > step.id
                                            ? 'bg-green-500 text-white'
                                            : currentStep === step.id
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                            }`}
                                    >
                                        {currentStep > step.id ? (
                                            <Check className="w-6 h-6" />
                                        ) : (
                                            step.id
                                        )}
                                    </div>
                                    <div className="mt-2 text-center">
                                        <p className={`text-sm font-medium ${currentStep >= step.id
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-400'
                                            }`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Connector */}
                                {index < steps.length - 1 && (
                                    <div className={`flex-1 h-1 mx-4 rounded ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Step 1: Select Courier */}
                    {currentStep === 1 && (
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Select Courier Partner
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Choose the courier partner for this manifest
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {courierOptions.map((courier) => (
                                    <button
                                        key={courier.value}
                                        onClick={() => setSelectedCourier(courier.value)}
                                        className={`p-4 rounded-xl border-2 transition-all ${selectedCourier === courier.value
                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <Truck className={`w-6 h-6 ${selectedCourier === courier.value
                                                ? 'text-primary-600 dark:text-primary-400'
                                                : 'text-gray-400'
                                                }`} />
                                            {selectedCourier === courier.value && (
                                                <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                            )}
                                        </div>
                                        <p className={`font-medium ${selectedCourier === courier.value
                                            ? 'text-primary-700 dark:text-primary-300'
                                            : 'text-gray-900 dark:text-white'
                                            }`}>
                                            {courier.label}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Shipments */}
                    {currentStep === 2 && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Select Shipments
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Select shipments ready for pickup via {courierOptions.find(c => c.value === selectedCourier)?.label}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedShipments.length} selected
                                    </p>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by AWB or destination..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            {/* Shipments List */}
                            {isLoadingShipments ? (
                                <Loader variant="spinner" size="lg" message="Loading shipments..." centered />
                            ) : filteredShipments.length === 0 ? (
                                <div className="text-center py-12">
                                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <p className="text-gray-600 dark:text-gray-400">No shipments ready for pickup</p>
                                </div>
                            ) : (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    {/* Header */}
                                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={filteredShipments.length === selectedShipments.length}
                                                onChange={selectAllShipments}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Select All ({filteredShipments.length})
                                            </span>
                                        </label>
                                    </div>

                                    {/* Scrollable List */}
                                    <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                                        {filteredShipments.map((shipment) => (
                                            <label
                                                key={shipment.shipmentId}
                                                className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${selectedShipments.includes(shipment.shipmentId)
                                                    ? 'bg-primary-50 dark:bg-primary-900/10'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedShipments.includes(shipment.shipmentId)}
                                                    onChange={() => toggleShipment(shipment.shipmentId)}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {shipment.awbNumber}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                        {shipment.destination.city}, {shipment.destination.state}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {shipment.weight} kg
                                                    </p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${shipment.paymentMode === 'COD'
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                        }`}>
                                                        {shipment.paymentMode}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Selected Summary */}
                            {selectedShipments.length > 0 && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Shipments</p>
                                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                {selectedShipments.length}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Weight</p>
                                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                {totalWeight.toFixed(2)} kg
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">COD Amount</p>
                                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                ₹{totalCod.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Review & Create */}
                    {currentStep === 3 && (
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Review & Create Manifest
                            </h2>

                            {/* Pickup Date & Time */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Pickup Schedule
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Date Picker */}
                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            Pickup Date
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="date"
                                                value={pickupDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setPickupDate(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Slot Selection */}
                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            Pickup Slot
                                        </label>
                                        <div className="space-y-2">
                                            {pickupSlots.map((slot) => (
                                                <button
                                                    key={slot.label}
                                                    onClick={() => setPickupSlot({ start: slot.start, end: slot.end })}
                                                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${pickupSlot?.start === slot.start
                                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <Clock className={`w-4 h-4 ${pickupSlot?.start === slot.start
                                                        ? 'text-primary-600'
                                                        : 'text-gray-400'
                                                        }`} />
                                                    <span className={
                                                        pickupSlot?.start === slot.start
                                                            ? 'text-primary-700 dark:text-primary-300'
                                                            : 'text-gray-700 dark:text-gray-300'
                                                    }>
                                                        {slot.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                                    Manifest Summary
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Courier Partner</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {courierOptions.find(c => c.value === selectedCourier)?.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Total Shipments</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {selectedShipments.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Total Weight</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {totalWeight.toFixed(2)} kg
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">COD Amount</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            ₹{totalCod.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Pickup Date</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {new Date(pickupDate).toLocaleDateString('en-IN', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    {pickupSlot && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Pickup Slot</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {pickupSlot.start} - {pickupSlot.end}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div>
                            {currentStep > 1 && (
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Link
                                href="/seller/manifests"
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </Link>

                            {currentStep < totalSteps ? (
                                <button
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!canProceed() || isCreating}
                                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader variant="dots" size="sm" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Create Manifest
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
