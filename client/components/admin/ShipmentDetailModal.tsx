"use client";

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/admin/StatusBadge';
import {
    Package, MapPin, User, Phone, Mail, Truck, Calendar,
    IndianRupee, Copy, ExternalLink, Clock, FileText
} from 'lucide-react';
import { useToast } from '@/src/shared/components/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Shipment } from '@/types/admin';

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
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-lg">{shipment.awb}</span>
                            <button
                                onClick={() => handleCopy(shipment.awb, 'AWB')}
                                className="p-1 hover:bg-gray-200 rounded"
                            >
                                <Copy className="h-3 w-3 text-gray-400" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500">Order: {shipment.orderNumber}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                </div>

                {/* Customer Info */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" /> Customer Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Name</p>
                            <p className="font-medium">{shipment.customer.name}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="font-medium flex items-center gap-2">
                                {shipment.customer.phone}
                                <Phone className="h-3 w-3 text-gray-400" />
                            </p>
                        </div>
                    </div>
                </div>

                {/* Route Info */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Route Details
                    </h4>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Origin</p>
                            <p className="font-medium">{shipment.origin.city}</p>
                            <p className="text-xs text-gray-400">{shipment.origin.state}</p>
                        </div>
                        <div className="flex items-center text-gray-400">
                            <div className="w-8 h-0.5 bg-gray-300" />
                            <Truck className="h-5 w-5 mx-2" />
                            <div className="w-8 h-0.5 bg-gray-300" />
                        </div>
                        <div className="flex-1 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <p className="text-xs text-indigo-600">Destination</p>
                            <p className="font-medium text-indigo-900">{shipment.destination.city}</p>
                            <p className="text-xs text-indigo-400">{shipment.destination.state}</p>
                        </div>
                    </div>
                </div>

                {/* Shipping Details */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <Truck className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500">Courier</p>
                        <p className="font-medium text-sm">{shipment.courier}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <Package className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500">Weight</p>
                        <p className="font-medium text-sm">{shipment.weight} kg</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <IndianRupee className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="font-medium text-sm">{formatCurrency(shipment.codAmount)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <Calendar className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="font-medium text-sm">{formatDate(shipment.createdAt)}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" className="flex-1">
                        <FileText className="h-4 w-4 mr-2" /> Download Label
                    </Button>
                    <Button variant="outline" className="flex-1">
                        <ExternalLink className="h-4 w-4 mr-2" /> Track on Courier
                    </Button>
                    <Button className="flex-1">
                        <Phone className="h-4 w-4 mr-2" /> Contact Support
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
