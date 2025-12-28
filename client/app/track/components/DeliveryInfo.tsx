'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, User, Phone, FileText } from 'lucide-react';

interface DeliveryInfoProps {
    city: string;
    state: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    recipientName?: string;
    contactMasked?: string;
    deliveryNotes?: string;
    className?: string;
}

export function DeliveryInfo({
    city,
    state,
    estimatedDelivery,
    actualDelivery,
    recipientName,
    contactMasked,
    deliveryNotes,
    className = '',
}: DeliveryInfoProps) {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            }),
            time: date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
            }),
        };
    };

    const deliveryDate = actualDelivery
        ? formatDate(actualDelivery)
        : formatDate(estimatedDelivery);

    const isDelivered = !!actualDelivery;

    return (
        <motion.div
            className={`bg-[var(--bg-elevated)] rounded-2xl p-5 md:p-6 border border-[var(--border-default)] ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Delivery Information
                </h3>
                {isDelivered && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--success-bg)] text-[var(--success)]">
                        Delivered
                    </span>
                )}
            </div>

            {/* Address Section */}
            <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                </div>
                <div>
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] block mb-0.5">
                        Destination
                    </span>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                        {city}, {state}
                    </p>
                </div>
            </div>

            {/* Delivery Date */}
            {deliveryDate && (
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] flex-shrink-0">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] block mb-0.5">
                            {isDelivered ? 'Delivered On' : 'Expected Delivery'}
                        </span>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                            {deliveryDate.date}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                            {deliveryDate.time}
                        </p>
                    </div>
                </div>
            )}

            {/* Recipient (if available) */}
            {recipientName && (
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] flex-shrink-0">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] block mb-0.5">
                            Recipient
                        </span>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                            {recipientName}
                        </p>
                        {contactMasked && (
                            <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {contactMasked}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Delivery Notes */}
            {deliveryNotes && (
                <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] block mb-0.5">
                                Delivery Notes
                            </span>
                            <p className="text-xs text-[var(--text-secondary)]">
                                {deliveryNotes}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* No recipient info fallback */}
            {!recipientName && !deliveryNotes && (
                <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {isDelivered ? 'Successfully delivered to address' : 'Awaiting delivery'}
                    </p>
                </div>
            )}
        </motion.div>
    );
}
