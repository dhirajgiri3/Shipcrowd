"use client";

import { Modal } from '@/src/components/ui/feedback/Modal';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/admin/StatusBadge';
import {
    Package, MapPin, User, Phone, Mail, Truck, Calendar,
    IndianRupee, Copy, ExternalLink, Clock, FileText
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { Shipment } from '@/src/types/admin';

interface ShipmentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipment: Shipment | null;
}

export function ShipmentDetailModal({ isOpen, onClose, shipment }: ShipmentDetailModalProps) {
    const { addToast } = useToast();

    if (!shipment) return null;

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast(`${label} copied!`, 'success');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Shipment Details" size="lg">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-start justify-between p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-lg text-[var(--text-primary)]">{shipment.awb}</span>
                            <button
                                onClick={() => handleCopy(shipment.awb, 'AWB')}
                                className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                            >
                                <Copy className="h-3 w-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                            </button>
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">Order: {shipment.orderNumber}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                </div>

                {/* Customer Info */}
                <div>
                    <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" /> Customer Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Name</p>
                            <p className="font-medium text-[var(--text-primary)]">{shipment.customer.name}</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Phone</p>
                            <p className="font-medium flex items-center gap-2 text-[var(--text-primary)]">
                                {shipment.customer.phone}
                                <Phone className="h-3 w-3 text-[var(--text-muted)]" />
                            </p>
                        </div>
                    </div>
                </div>

                {/* Route Info */}
                <div>
                    <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Route Details
                    </h4>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Origin</p>
                            <p className="font-medium text-[var(--text-primary)]">{shipment.origin.city}</p>
                            <p className="text-xs text-[var(--text-muted)]">{shipment.origin.state}</p>
                        </div>
                        <div className="flex items-center text-[var(--border-strong)]">
                            <div className="w-8 h-0.5 bg-current opacity-30" />
                            <Truck className="h-5 w-5 mx-2 text-[var(--text-muted)]" />
                            <div className="w-8 h-0.5 bg-current opacity-30" />
                        </div>
                        <div className="flex-1 p-3 bg-[var(--primary-blue-soft)]/50 rounded-xl border border-[var(--primary-blue)]/10">
                            <p className="text-xs text-[var(--primary-blue)]">Destination</p>
                            <p className="font-medium text-[var(--text-primary)]">{shipment.destination.city}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{shipment.destination.state}</p>
                        </div>
                    </div>
                </div>

                {/* Shipping Details */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-xl text-center border border-[var(--border-subtle)]">
                        <Truck className="h-4 w-4 mx-auto text-[var(--text-muted)] mb-1" />
                        <p className="text-xs text-[var(--text-muted)]">Courier</p>
                        <p className="font-medium text-sm text-[var(--text-primary)]">{shipment.courier}</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-xl text-center border border-[var(--border-subtle)]">
                        <Package className="h-4 w-4 mx-auto text-[var(--text-muted)] mb-1" />
                        <p className="text-xs text-[var(--text-muted)]">Weight</p>
                        <p className="font-medium text-sm text-[var(--text-primary)]">{shipment.weight} kg</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-xl text-center border border-[var(--border-subtle)]">
                        <IndianRupee className="h-4 w-4 mx-auto text-[var(--text-muted)] mb-1" />
                        <p className="text-xs text-[var(--text-muted)]">Amount</p>
                        <p className="font-medium text-sm text-[var(--text-primary)]">{formatCurrency(shipment.codAmount)}</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-xl text-center border border-[var(--border-subtle)]">
                        <Calendar className="h-4 w-4 mx-auto text-[var(--text-muted)] mb-1" />
                        <p className="text-xs text-[var(--text-muted)]">Created</p>
                        <p className="font-medium text-sm text-[var(--text-primary)]">{formatDate(shipment.createdAt)}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-[var(--border-subtle)]">
                    <Button variant="outline" className="flex-1 bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        <FileText className="h-4 w-4 mr-2" /> Download Label
                    </Button>
                    <Button variant="outline" className="flex-1 bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        <ExternalLink className="h-4 w-4 mr-2" /> Track on Courier
                    </Button>
                    <Button className="flex-1 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white">
                        <Phone className="h-4 w-4 mr-2" /> Contact Support
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
