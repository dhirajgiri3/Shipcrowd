/**
 * Return Label Modal
 *
 * Modal for generating return shipping labels:
 * - Carrier selection (Velocity, Delhivery, Ekart, etc.)
 * - Label format selection (PDF, PNG)
 * - Label size selection (A4, 4x6 thermal)
 * - Email to customer option
 * - Download functionality
 */

'use client';

import React, { useState } from 'react';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/client';
import type { ReturnRequest } from '@/src/types/api/returns';

interface ReturnLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    returnRequest: ReturnRequest;
}

type CarrierOption = 'velocity' | 'delhivery' | 'ekart' | 'xpressbees' | 'bluedart';
type LabelFormat = 'pdf' | 'png';
type LabelSize = 'a4' | '4x6';

interface GenerateLabelPayload {
    returnId: string;
    carrier: CarrierOption;
    format: LabelFormat;
    size: LabelSize;
    emailToCustomer: boolean;
}

interface LabelResponse {
    labelUrl: string;
    trackingNumber: string;
    carrier: string;
    expiresAt: string;
}

const CARRIER_OPTIONS: { value: CarrierOption; label: string; logo?: string }[] = [
    { value: 'velocity', label: 'Velocity' },
    { value: 'delhivery', label: 'Delhivery' },
    { value: 'ekart', label: 'Ekart' },
    { value: 'xpressbees', label: 'XpressBees' },
    { value: 'bluedart', label: 'BlueDart' },
];

const FORMAT_OPTIONS: { value: LabelFormat; label: string; description: string }[] = [
    { value: 'pdf', label: 'PDF', description: 'Best for printing on regular printers' },
    { value: 'png', label: 'PNG', description: 'Image format for thermal printers' },
];

const SIZE_OPTIONS: { value: LabelSize; label: string; description: string }[] = [
    { value: 'a4', label: 'A4', description: '210mm × 297mm (Regular paper)' },
    { value: '4x6', label: '4×6 inch', description: '101mm × 152mm (Thermal labels)' },
];

export function ReturnLabelModal({ isOpen, onClose, returnRequest }: ReturnLabelModalProps) {
    const [carrier, setCarrier] = useState<CarrierOption>('velocity');
    const [labelFormat, setLabelFormat] = useState<LabelFormat>('pdf');
    const [labelSize, setLabelSize] = useState<LabelSize>('a4');
    const [emailToCustomer, setEmailToCustomer] = useState(true);

    const queryClient = useQueryClient();

    const generateLabel = useMutation({
        mutationFn: async (payload: GenerateLabelPayload): Promise<LabelResponse> => {
            const response = await apiClient.post(`/returns/${payload.returnId}/generate-label`, {
                carrier: payload.carrier,
                format: payload.format,
                size: payload.size,
                emailToCustomer: payload.emailToCustomer,
            });
            return response.data;
        },
        onSuccess: (data) => {
            // Open label in new tab for download
            window.open(data.labelUrl, '_blank');

            showSuccessToast(
                emailToCustomer
                    ? `Label sent to customer. Tracking: ${data.trackingNumber}`
                    : `Tracking number: ${data.trackingNumber}`
            );

            // Invalidate return query to refresh status
            queryClient.invalidateQueries({ queryKey: ['returns', returnRequest._id] });

        },
        onError: (error: unknown) => {
            handleApiError(error, 'Failed to generate return label. Please try again or contact support');
        },
    });

    const handleGenerate = () => {
        generateLabel.mutate({
            returnId: returnRequest._id,
            carrier,
            format: labelFormat,
            size: labelSize,
            emailToCustomer,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Generate Return Label
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Return ID: {returnRequest.returnId}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={generateLabel.isPending}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Customer Details
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <p>{returnRequest.customerName || 'Customer'}</p>
                            <p className="text-xs">{returnRequest.customerPhone || 'Phone on file'}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Carrier Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Shipping Carrier
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {CARRIER_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setCarrier(option.value)}
                                        disabled={generateLabel.isPending}
                                        className={`px-4 py-3 text-left rounded-lg border-2 transition-all ${carrier === option.value
                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                            } disabled:opacity-50`}
                                    >
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {option.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Format Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Label Format
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {FORMAT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setLabelFormat(option.value)}
                                        disabled={generateLabel.isPending}
                                        className={`px-4 py-3 text-left rounded-lg border-2 transition-all ${labelFormat === option.value
                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                            } disabled:opacity-50`}
                                    >
                                        <span className="font-medium text-gray-900 dark:text-white block">
                                            {option.label}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {option.description}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Size Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Label Size
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {SIZE_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setLabelSize(option.value)}
                                        disabled={generateLabel.isPending}
                                        className={`px-4 py-3 text-left rounded-lg border-2 transition-all ${labelSize === option.value
                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                            } disabled:opacity-50`}
                                    >
                                        <span className="font-medium text-gray-900 dark:text-white block">
                                            {option.label}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {option.description}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Email to Customer */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="emailToCustomer"
                                checked={emailToCustomer}
                                onChange={(e) => setEmailToCustomer(e.target.checked)}
                                disabled={generateLabel.isPending}
                                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            />
                            <label
                                htmlFor="emailToCustomer"
                                className="text-sm text-gray-700 dark:text-gray-300"
                            >
                                Email label to customer automatically
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={generateLabel.isPending}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={generateLabel.isPending}
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {generateLabel.isPending ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    Generate Label
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
