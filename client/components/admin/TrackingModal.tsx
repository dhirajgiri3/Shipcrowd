"use client";

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    Search, Package, CheckCircle, Truck, MapPin, Clock,
    Phone, Copy, ExternalLink
} from 'lucide-react';
import { useToast } from '@/src/shared/components/Toast';

interface TrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialAwb?: string;
}

const mockTrackingData = {
    awb: 'AWB234567890123',
    status: 'in-transit',
    courier: 'Delhivery',
    origin: 'Mumbai, Maharashtra',
    destination: 'Delhi, Delhi',
    expectedDelivery: 'Dec 11, 2024',
    weight: '1.2 kg',
    timeline: [
        { status: 'Order Placed', location: 'Mumbai', time: 'Dec 8, 2024 10:30 AM', completed: true },
        { status: 'Picked Up', location: 'Mumbai Hub', time: 'Dec 8, 2024 02:45 PM', completed: true },
        { status: 'In Transit', location: 'Nagpur Sorting', time: 'Dec 9, 2024 06:20 AM', completed: true },
        { status: 'Out for Delivery', location: 'Delhi Hub', time: 'Pending', completed: false },
        { status: 'Delivered', location: 'Destination', time: 'Pending', completed: false },
    ]
};

export function TrackingModal({ isOpen, onClose, initialAwb = '' }: TrackingModalProps) {
    const [awb, setAwb] = useState(initialAwb);
    const [isTracking, setIsTracking] = useState(false);
    const [showResult, setShowResult] = useState(!!initialAwb);
    const { addToast } = useToast();

    const handleTrack = () => {
        if (!awb.trim()) {
            addToast('Please enter an AWB number', 'warning');
            return;
        }
        setIsTracking(true);
        // Simulate API call
        setTimeout(() => {
            setIsTracking(false);
            setShowResult(true);
            addToast('Shipment found!', 'success');
        }, 1000);
    };

    const handleCopyAwb = () => {
        navigator.clipboard.writeText(mockTrackingData.awb);
        addToast('AWB copied to clipboard', 'success');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Track Shipment" size="lg">
            <div className="space-y-6">
                {/* Search Input */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter AWB Number"
                        value={awb}
                        onChange={(e) => setAwb(e.target.value)}
                        icon={<Search className="h-4 w-4" />}
                        className="flex-1"
                    />
                    <Button onClick={handleTrack} disabled={isTracking}>
                        {isTracking ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Tracking...
                            </span>
                        ) : (
                            'Track'
                        )}
                    </Button>
                </div>

                {/* Results */}
                {showResult && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        {/* Header */}
                        <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-indigo-600" />
                                    <span className="font-mono font-medium">{mockTrackingData.awb}</span>
                                    <button onClick={handleCopyAwb} className="p-1 hover:bg-gray-200 rounded">
                                        <Copy className="h-3 w-3 text-gray-400" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {mockTrackingData.origin} → {mockTrackingData.destination}
                                </p>
                            </div>
                            <Badge variant="info" className="capitalize">
                                {mockTrackingData.status.replace('-', ' ')}
                            </Badge>
                        </div>

                        {/* Quick Info */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Courier</p>
                                <p className="font-medium">{mockTrackingData.courier}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Weight</p>
                                <p className="font-medium">{mockTrackingData.weight}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Expected Delivery</p>
                                <p className="font-medium text-emerald-600">{mockTrackingData.expectedDelivery}</p>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div>
                            <h4 className="font-medium text-gray-900 mb-4">Shipment Timeline</h4>
                            <div className="relative">
                                {mockTrackingData.timeline.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 pb-6 last:pb-0">
                                        {/* Line & Dot */}
                                        <div className="relative flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full z-10 ${step.completed ? 'bg-emerald-500' : 'bg-gray-300'
                                                }`} />
                                            {idx < mockTrackingData.timeline.length - 1 && (
                                                <div className={`absolute top-3 w-0.5 h-full ${step.completed ? 'bg-emerald-500' : 'bg-gray-200'
                                                    }`} />
                                            )}
                                        </div>
                                        {/* Content */}
                                        <div className="flex-1 -mt-0.5">
                                            <p className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                                                {step.status}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                                <MapPin className="h-3 w-3" />
                                                <span>{step.location}</span>
                                                <Clock className="h-3 w-3 ml-2" />
                                                <span>{step.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t">
                            <Button variant="outline" className="flex-1">
                                <Phone className="h-4 w-4 mr-2" /> Contact Courier
                            </Button>
                            <Button variant="outline" className="flex-1">
                                <ExternalLink className="h-4 w-4 mr-2" /> View on Courier Site
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
