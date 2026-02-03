/**
 * Take Action Modal for NDR Cases
 * 
 * Supports multiple action types:
 * - Reattempt delivery
 * - Address correction
 * - Reschedule delivery
 * - Cancel order
 * - Convert to prepaid
 * - Contact customer
 * - Return to origin
 */

'use client';

import React, { useState } from 'react';
import { useTakeNDRAction } from '@/src/core/api/hooks';
import type { NDRAction, CommunicationChannel, TakeNDRActionPayload } from '@/src/types/api/orders';

interface TakeActionModalProps {
    caseId: string;
    isOpen: boolean;
    onClose: () => void;
    defaultAction?: NDRAction;
}

const ACTION_CONFIG: Record<NDRAction, {
    label: string;
    icon: string;
    color: string;
    description: string;
}> = {
    reattempt_delivery: {
        label: 'Reattempt Delivery',
        icon: '🔄',
        color: 'bg-[var(--primary-blue)]',
        description: 'Schedule another delivery attempt at the same address',
    },
    address_correction: {
        label: 'Correct Address',
        icon: '📍',
        color: 'bg-purple-600', // Pending variable
        description: 'Update delivery address with customer-provided correction',
    },
    reschedule_delivery: {
        label: 'Reschedule Delivery',
        icon: '📅',
        color: 'bg-indigo-600', // Pending variable
        description: 'Set a new delivery date as per customer request',
    },
    cancel_order: {
        label: 'Cancel Order',
        icon: '❌',
        color: 'bg-[var(--error)]',
        description: 'Cancel the order at customer request',
    },
    convert_prepaid: {
        label: 'Convert to Prepaid',
        icon: '💳',
        color: 'bg-[var(--success)]',
        description: 'Convert COD order to prepaid with customer payment',
    },
    contact_customer: {
        label: 'Contact Customer',
        icon: '📞',
        color: 'bg-[var(--warning)]',
        description: 'Send manual communication to customer',
    },
    return_to_origin: {
        label: 'Return to Origin',
        icon: '↩️',
        color: 'bg-[var(--warning)]',
        description: 'Initiate RTO process for this shipment',
    },
};

export function TakeActionModal({ caseId, isOpen, onClose, defaultAction }: TakeActionModalProps) {
    const [selectedAction, setSelectedAction] = useState<NDRAction | null>(defaultAction || null);
    const [notes, setNotes] = useState('');
    const [newDeliveryDate, setNewDeliveryDate] = useState('');
    const [channel, setChannel] = useState<CommunicationChannel>('whatsapp');

    // Address correction fields
    const [addressForm, setAddressForm] = useState({
        name: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        landmark: '',
    });

    const takeAction = useTakeNDRAction();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedAction) return;

        const payload: TakeNDRActionPayload = {
            action: selectedAction,
            notes,
        };

        // Add conditional fields based on action type
        if (selectedAction === 'reschedule_delivery' && newDeliveryDate) {
            payload.newDeliveryDate = newDeliveryDate;
        }

        if (selectedAction === 'address_correction') {
            payload.newAddress = addressForm;
        }

        if (selectedAction === 'contact_customer') {
            payload.communicationChannel = channel;
        }

        try {
            await takeAction.mutateAsync({ caseId, payload });
            onClose();
        } catch (error) {
            console.error('Failed to take action:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-elevated)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-default)]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                            Take Action on NDR
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Action Selection */}
                    {!defaultAction && (
                        <div className="p-6 border-b border-[var(--border-default)]">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                                Select Action
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(ACTION_CONFIG).map(([action, config]) => (
                                    <button
                                        key={action}
                                        type="button"
                                        onClick={() => setSelectedAction(action as NDRAction)}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${selectedAction === action
                                            ? 'border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]'
                                            : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-2xl">{config.icon}</span>
                                            <span className="font-medium text-[var(--text-primary)]">
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {config.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action-Specific Fields */}
                    {selectedAction && (
                        <div className="p-6 space-y-6">
                            {/* Reschedule Date */}
                            {selectedAction === 'reschedule_delivery' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        New Delivery Date
                                    </label>
                                    <input
                                        type="date"
                                        value={newDeliveryDate}
                                        onChange={(e) => setNewDeliveryDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                        required
                                    />
                                </div>
                            )}

                            {/* Address Correction Form */}
                            {selectedAction === 'address_correction' && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900 dark:text-white">New Address Details</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Customer Name
                                            </label>
                                            <input
                                                type="text"
                                                value={addressForm.name}
                                                onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={addressForm.phone}
                                                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Address Line 1
                                        </label>
                                        <input
                                            type="text"
                                            value={addressForm.addressLine1}
                                            onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Address Line 2
                                        </label>
                                        <input
                                            type="text"
                                            value={addressForm.addressLine2}
                                            onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                value={addressForm.city}
                                                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                State
                                            </label>
                                            <input
                                                type="text"
                                                value={addressForm.state}
                                                onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Pincode
                                            </label>
                                            <input
                                                type="text"
                                                value={addressForm.pincode}
                                                onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                                pattern="[0-9]{6}"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Landmark (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={addressForm.landmark}
                                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Communication Channel */}
                            {selectedAction === 'contact_customer' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Communication Channel
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['whatsapp', 'sms', 'email'] as CommunicationChannel[]).map((ch) => (
                                            <button
                                                key={ch}
                                                type="button"
                                                onClick={() => setChannel(ch)}
                                                className={`px-4 py-3 rounded-lg border-2 capitalize font-medium ${channel === ch
                                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {ch === 'whatsapp' && '💬'} {ch === 'sms' && '📱'} {ch === 'email' && '📧'} {ch}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Notes {selectedAction !== 'address_correction' && '(Optional)'}
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
                                    placeholder="Add any additional notes or instructions..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="p-6 border-t border-[var(--border-default)] flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedAction || takeAction.isPending}
                            className="px-6 py-2 bg-[var(--primary-blue)] text-white rounded-lg hover:bg-[var(--primary-blue-deep)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {takeAction.isPending ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {selectedAction && ACTION_CONFIG[selectedAction].icon} Take Action
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
